import logging
import shutil
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import Hotspot, WireGuardConfig

logger = logging.getLogger(__name__)

WG_BACKUP_DIR = Path("/etc/wireguard/backups")


def wg_genkey() -> str:
    result = subprocess.run(["wg", "genkey"], capture_output=True, text=True, timeout=5)
    if result.returncode != 0:
        raise RuntimeError(f"wg genkey failed: {result.stderr}")
    return result.stdout.strip()


def wg_pubkey(private_key: str) -> str:
    result = subprocess.run(
        ["wg", "pubkey"], input=private_key, capture_output=True, text=True, timeout=5
    )
    if result.returncode != 0:
        raise RuntimeError(f"wg pubkey failed: {result.stderr}")
    return result.stdout.strip()


def generate_wg_config(wg: WireGuardConfig, hotspots: list[Hotspot], include_address: bool = True) -> str:
    allowed_ips = [wg.router_address]
    for h in hotspots:
        if h.enabled:
            allowed_ips.append(h.subnet)

    lines = ["[Interface]"]
    if include_address:
        lines.append(f"Address = {wg.vps_address}")
    lines.extend([
        f"ListenPort = {wg.listen_port}",
        f"PrivateKey = {wg.vps_private_key}",
        "",
        "[Peer]",
        f"PublicKey = {wg.router_public_key}",
        f"AllowedIPs = {', '.join(allowed_ips)}",
        f"Endpoint = {wg.router_endpoint}",
        "",
    ])
    return "\n".join(lines)


def get_allowed_ips(wg: WireGuardConfig, hotspots: list[Hotspot]) -> list[str]:
    ips = [wg.router_address]
    for h in hotspots:
        if h.enabled:
            ips.append(h.subnet)
    return ips


async def preview_wg_config(db: AsyncSession) -> dict:
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    if not wg:
        return {"config": "", "allowed_ips": []}

    hs_result = await db.execute(select(Hotspot).options(selectinload(Hotspot.reservations)))
    hotspots = hs_result.scalars().all()

    config = generate_wg_config(wg, hotspots)
    allowed = get_allowed_ips(wg, hotspots)
    return {"config": config, "allowed_ips": allowed}


async def init_wg_interface(db: AsyncSession) -> dict:
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()

    config_path = Path(f"/etc/wireguard/wg1.conf")

    if wg and config_path.exists():
        return {"success": True, "message": "wg1 already configured", "created": False}

    private_key = wg_genkey()
    public_key = wg_pubkey(private_key)

    if not wg:
        wg = WireGuardConfig(
            interface_name="wg1",
            listen_port=51821,
            vps_address="10.200.0.1/32",
            vps_private_key=private_key,
            router_public_key="FILL_IN_ROUTER_PUBLIC_KEY",
            router_endpoint="FILL_IN_ROUTER_ENDPOINT:51820",
            router_address="10.200.0.2/32",
        )
        db.add(wg)
    else:
        wg.vps_private_key = private_key

    await db.commit()
    await db.refresh(wg)

    hs_result = await db.execute(select(Hotspot).options(selectinload(Hotspot.reservations)))
    hotspots = hs_result.scalars().all()

    config_str = generate_wg_config(wg, hotspots)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(config_str)

    try:
        subprocess.run(["wg-quick", "up", "wg1"], capture_output=True, text=True, timeout=10)
    except FileNotFoundError:
        pass

    return {
        "success": True,
        "message": "wg1 created with new keys",
        "created": True,
        "public_key": public_key,
    }


def _get_interface_ips(interface: str) -> list[str]:
    result = subprocess.run(
        ["ip", "-4", "-o", "addr", "show", interface],
        capture_output=True, text=True, timeout=5,
    )
    ips = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 4:
            ips.append(parts[3])
    return ips


def _sync_interface_ip(interface: str, desired_address: str) -> None:
    current_ips = _get_interface_ips(interface)
    if desired_address in current_ips:
        return
    for old_ip in current_ips:
        subprocess.run(
            ["ip", "addr", "del", old_ip, "dev", interface],
            capture_output=True, text=True, timeout=5,
        )
    subprocess.run(
        ["ip", "addr", "add", desired_address, "dev", interface],
        capture_output=True, text=True, timeout=5,
    )


def _sync_routes(interface: str, hotspots: list[Hotspot], router_address: str) -> None:
    result = subprocess.run(
        ["ip", "-4", "-o", "route", "show", "dev", interface],
        capture_output=True, text=True, timeout=5,
    )
    current_routes: set[str] = set()
    for line in result.stdout.splitlines():
        parts = line.split()
        if parts:
            current_routes.add(parts[0])

    desired: set[str] = {router_address.split("/")[0] + "/" + router_address.split("/")[1]}
    for h in hotspots:
        if h.enabled:
            desired.add(h.subnet)

    for route in desired:
        if route not in current_routes:
            subprocess.run(
                ["ip", "route", "add", route, "dev", interface],
                capture_output=True, text=True, timeout=5,
            )


async def auto_sync_wg_allowed_ips(db: AsyncSession) -> None:
    try:
        result = await db.execute(select(WireGuardConfig))
        wg = result.scalar_one_or_none()
        if not wg:
            return

        interface = wg.interface_name
        if not Path(f"/sys/class/net/{interface}").exists():
            return

        hs_result = await db.execute(select(Hotspot))
        hotspots = hs_result.scalars().all()

        sync_config = generate_wg_config(wg, hotspots, include_address=False)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".conf", delete=False) as tmp:
            tmp.write(sync_config)
            tmp_path = tmp.name
        try:
            subprocess.run(
                ["wg", "syncconf", interface, tmp_path],
                capture_output=True, text=True, timeout=10,
            )
        finally:
            Path(tmp_path).unlink(missing_ok=True)

        _sync_routes(interface, hotspots, wg.router_address)
    except Exception as e:
        logger.warning(f"auto_sync_wg_allowed_ips failed: {e}")


async def apply_wg_config(db: AsyncSession) -> dict:
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    if not wg:
        return {"success": False, "message": "WireGuard config not found", "backup_path": None}

    hs_result = await db.execute(select(Hotspot).options(selectinload(Hotspot.reservations)))
    hotspots = hs_result.scalars().all()

    config_str = generate_wg_config(wg, hotspots)
    config_path = Path(f"/etc/wireguard/{wg.interface_name}.conf")

    WG_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = None
    if config_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = WG_BACKUP_DIR / f"{wg.interface_name}.conf.{timestamp}.bak"
        shutil.copy2(config_path, backup_path)
        backup_path = str(backup_path)

    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(config_str)

    interface_exists = Path(f"/sys/class/net/{wg.interface_name}").exists()

    try:
        if interface_exists:
            sync_config = generate_wg_config(wg, hotspots, include_address=False)
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".conf", delete=False
            ) as tmp:
                tmp.write(sync_config)
                tmp_path = tmp.name
            try:
                result = subprocess.run(
                    ["wg", "syncconf", wg.interface_name, tmp_path],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
            finally:
                Path(tmp_path).unlink(missing_ok=True)
            if result.returncode != 0:
                return {
                    "success": False,
                    "message": f"Config written but syncconf failed: {result.stderr.strip()}",
                    "backup_path": backup_path,
                }
            _sync_interface_ip(wg.interface_name, wg.vps_address)
            _sync_routes(wg.interface_name, hotspots, wg.router_address)
        else:
            up_result = subprocess.run(
                ["wg-quick", "up", wg.interface_name],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if up_result.returncode != 0:
                return {
                    "success": False,
                    "message": f"Config written but failed to bring up: {up_result.stderr.strip()}",
                    "backup_path": backup_path,
                }
    except FileNotFoundError:
        return {
            "success": False,
            "message": "Config written but wg command not found",
            "backup_path": backup_path,
        }

    return {
        "success": True,
        "message": f"WireGuard {wg.interface_name} config applied",
        "backup_path": backup_path,
    }


async def get_wg_status(interface_name: str = "wg1") -> dict:
    config_path = Path(f"/etc/wireguard/{interface_name}.conf")
    if not config_path.exists():
        return {"status": "not_initialized", "output": f"{interface_name}.conf not found"}

    try:
        result = subprocess.run(
            ["wg", "show", interface_name],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return {"status": "up", "output": result.stdout.strip()}
        return {"status": "down", "output": result.stderr.strip()}
    except FileNotFoundError:
        return {"status": "unknown", "output": "wg command not found"}

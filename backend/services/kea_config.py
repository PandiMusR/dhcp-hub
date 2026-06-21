import json
import logging
import os
import shutil
import signal
import subprocess
from datetime import datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models import Hotspot, HostReservation, WireGuardConfig

logger = logging.getLogger(__name__)

KEA_CONFIG_PATH = Path("/etc/kea/kea-dhcp4.conf")
KEA_BACKUP_DIR = Path("/etc/kea/backups")


def generate_kea_config(hotspots: list[Hotspot], interface: str = "wg1") -> dict:
    subnet4 = []
    for h in hotspots:
        if not h.enabled:
            continue
        subnet_entry = {
            "id": h.id,
            "subnet": h.subnet,
            "valid-lifetime": h.lease_time,
            "pools": [{"pool": f"{h.pool_start} - {h.pool_end}"}],
            "option-data": [
                {"name": "routers", "data": h.gateway},
                {"name": "domain-name-servers", "data": h.dns},
            ],
        }
        if h.reservations:
            reservations = []
            for r in h.reservations:
                res = {
                    "hw-address": r.hw_address,
                    "ip-address": r.ip_address,
                }
                if r.hostname:
                    res["hostname"] = r.hostname
                reservations.append(res)
            subnet_entry["reservations"] = reservations
        subnet4.append(subnet_entry)

    config = {
        "Dhcp4": {
            "interfaces-config": {
                "interfaces": [interface],
                "dhcp-socket-type": "udp",
            },
            "control-socket": {
                "socket-type": "unix",
                "socket-name": "/run/kea/kea4-ctrl-socket",
            },
            "lease-database": {
                "type": "memfile",
                "persist": True,
                "name": "/var/lib/kea/kea-leases4.csv",
                "lfc-interval": 604800,
            },
            "valid-lifetime": 86400,
            "renew-timer": 43200,
            "rebind-timer": 75600,
            "subnet4": subnet4,
            "loggers": [
                {
                    "name": "kea-dhcp4",
                    "output_options": [{"output": "/var/log/kea/kea-dhcp4.log"}],
                    "severity": "INFO",
                }
            ],
        }
    }
    return config


async def _get_interface(db: AsyncSession) -> str:
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    return wg.interface_name if wg else "wg1"


async def preview_config(db: AsyncSession) -> str:
    interface = await _get_interface(db)
    result = await db.execute(select(Hotspot).options(selectinload(Hotspot.reservations)))
    hotspots = result.scalars().all()
    config = generate_kea_config(hotspots, interface)
    return json.dumps(config, indent=2)


def _reload_kea() -> str | None:
    try:
        result = subprocess.run(
            ["pgrep", "-x", "kea-dhcp4"], capture_output=True, text=True, timeout=3
        )
        if result.returncode != 0:
            return "Kea process not found"
        pid = int(result.stdout.strip().split()[0])
        os.kill(pid, signal.SIGHUP)
        return None
    except Exception as e:
        return str(e)


async def apply_config(db: AsyncSession) -> dict:
    interface = await _get_interface(db)
    result = await db.execute(select(Hotspot).options(selectinload(Hotspot.reservations)))
    hotspots = result.scalars().all()
    config = generate_kea_config(hotspots, interface)
    config_str = json.dumps(config, indent=2)

    try:
        json.loads(config_str)
    except json.JSONDecodeError as e:
        return {"success": False, "message": f"Invalid JSON: {e}", "backup_path": None}

    backup_path = None
    if KEA_CONFIG_PATH.exists():
        KEA_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = KEA_BACKUP_DIR / f"kea-dhcp4.conf.{timestamp}.bak"
        shutil.copy2(KEA_CONFIG_PATH, backup_path)
        backup_path = str(backup_path)

    KEA_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    KEA_CONFIG_PATH.write_text(config_str)

    reload_err = _reload_kea()
    if reload_err:
        logger.warning(f"Config written but Kea reload failed: {reload_err}")
        return {
            "success": True,
            "message": f"Config ditulis tapi reload gagal: {reload_err}",
            "backup_path": backup_path,
        }

    return {
        "success": True,
        "message": "Config applied & Kea reloaded",
        "backup_path": backup_path,
    }


async def get_current_config() -> str:
    if KEA_CONFIG_PATH.exists():
        return KEA_CONFIG_PATH.read_text()
    return "{}"


async def list_backups() -> list[dict]:
    if not KEA_BACKUP_DIR.exists():
        return []
    backups = []
    for f in sorted(KEA_BACKUP_DIR.glob("*.bak"), reverse=True):
        backups.append(
            {
                "filename": f.name,
                "path": str(f),
                "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            }
        )
    return backups


async def rollback_config(backup_filename: str) -> dict:
    backup_path = KEA_BACKUP_DIR / backup_filename
    if not backup_path.exists():
        return {"success": False, "message": f"Backup not found: {backup_filename}"}

    try:
        content = backup_path.read_text()
        json.loads(content)
    except json.JSONDecodeError as e:
        return {"success": False, "message": f"Invalid backup JSON: {e}"}

    shutil.copy2(backup_path, KEA_CONFIG_PATH)

    reload_err = _reload_kea()
    if reload_err:
        logger.warning(f"Rolled back but Kea reload failed: {reload_err}")
        return {"success": True, "message": f"Rolled back ke {backup_filename}, tapi reload gagal: {reload_err}"}

    return {"success": True, "message": f"Rolled back ke {backup_filename} & Kea reloaded"}

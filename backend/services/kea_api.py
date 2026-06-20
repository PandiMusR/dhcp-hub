import csv
import json
import logging
import socket
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

KEA_SOCKET_PATH = "/run/kea/kea4-ctrl-socket"
KEA_LEASES_CSV = "/var/lib/kea/kea-leases4.csv"


def _send_command_sync(command: str, arguments: dict | None = None) -> dict:
    sock_path = Path(KEA_SOCKET_PATH)
    if not sock_path.exists():
        return {"result": 1, "text": "Kea control socket not found"}

    payload: dict = {"command": command, "service": ["dhcp4"]}
    if arguments:
        payload["arguments"] = arguments

    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect(KEA_SOCKET_PATH)
        sock.sendall(json.dumps(payload).encode())
        response = b""
        while True:
            data = sock.recv(65536)
            if not data:
                break
            response += data
        sock.close()
        return json.loads(response)
    except Exception as e:
        logger.warning(f"Kea socket command '{command}' failed: {e}")
        return {"result": 1, "text": str(e)}


def _read_leases_csv() -> list[dict]:
    leases_map: dict[str, dict] = {}
    csv_path = Path(KEA_LEASES_CSV)
    if not csv_path.exists():
        return []

    try:
        with open(csv_path, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                expire_ts = row.get("expire", "")
                expire_iso = None
                try:
                    ts = int(expire_ts)
                    if ts > 0:
                        expire_iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
                except (ValueError, TypeError):
                    pass

                ip = row.get("address", "")
                hw = row.get("hwaddr", "")
                entry = {
                    "ip-address": ip,
                    "hw-address": hw,
                    "hostname": row.get("hostname") or None,
                    "valid-lft": int(row["valid_lifetime"]) if row.get("valid_lifetime") else None,
                    "expire": expire_iso,
                    "subnet-id": int(row["subnet_id"]) if row.get("subnet_id") else None,
                    "state": int(row["state"]) if row.get("state") else None,
                }
                leases_map[f"{ip}:{hw}"] = entry
    except Exception as e:
        logger.warning(f"Failed to read leases CSV: {e}")

    return list(leases_map.values())


async def get_all_leases() -> list[dict]:
    return _read_leases_csv()


async def get_leases_by_subnet(subnet_id: int) -> list[dict]:
    return [l for l in _read_leases_csv() if l.get("subnet-id") == subnet_id]


async def get_kea_version() -> str | None:
    try:
        result = _send_command_sync("version-get")
        if result.get("result") == 0:
            versions = result.get("arguments", {})
            return versions.get("extended", versions.get("version", "unknown"))
        return None
    except Exception:
        return None


async def get_kea_status() -> dict:
    try:
        result = _send_command_sync("status-get")
        if result.get("result") == 0:
            return result.get("arguments", {})
        return {}
    except Exception:
        return {}

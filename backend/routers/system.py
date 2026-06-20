import csv
import json
import os
import subprocess
import time
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/system", tags=["system"])

START_TIME = time.time()

DHCP_HUB_DIR = Path("/root/apps/DHCPHub")
KEA_LEASES = Path("/var/lib/kea/kea-leases4.csv")
KEA_CONFIG = Path("/etc/kea/kea-dhcp4.conf")
KEA_BACKUPS = Path("/etc/kea/backups")


class ServiceInfo(BaseModel):
    name: str
    pid: int | None
    rss_mb: float
    cpu_percent: float
    status: str


class DiskUsage(BaseModel):
    label: str
    size_bytes: int


class SystemInfo(BaseModel):
    uptime_seconds: float
    ram_services_mb: float
    ram_services_detail: list[ServiceInfo]
    disk_items: list[DiskUsage]
    disk_total_bytes: int
    kea_subnets: int
    kea_leases: int


def _get_proc_rss(pid: int) -> float:
    try:
        with open(f"/proc/{pid}/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1]) / 1024
    except FileNotFoundError:
        pass
    return 0


def _find_pid(name: str) -> int | None:
    try:
        result = subprocess.run(
            ["pgrep", "-x", name], capture_output=True, text=True, timeout=3
        )
        if result.returncode == 0:
            return int(result.stdout.strip().split()[0])
    except Exception:
        pass
    return None


def _get_cpu_percent(pid: int | None) -> float:
    if not pid:
        return 0
    try:
        result = subprocess.run(
            ["ps", "-p", str(pid), "-o", "%cpu="],
            capture_output=True, text=True, timeout=3,
        )
        return round(float(result.stdout.strip()), 1)
    except Exception:
        return 0


def _dir_size(path: Path, exclude: set[str] | None = None) -> int:
    if not path.exists():
        return 0
    if path.is_file():
        return path.stat().st_size
    total = 0
    try:
        for f in path.rglob("*"):
            if f.is_file():
                rel = f.relative_to(path).parts
                if exclude and rel[0] in exclude:
                    continue
                total += f.stat().st_size
    except Exception:
        pass
    return total


def _count_kea_leases() -> int:
    if not KEA_LEASES.exists():
        return 0
    leases: set[str] = set()
    try:
        with open(KEA_LEASES) as f:
            for row in csv.DictReader(f):
                leases.add(f"{row['address']}:{row['hwaddr']}")
    except Exception:
        pass
    return len(leases)


def _count_kea_subnets() -> int:
    if not KEA_CONFIG.exists():
        return 0
    try:
        d = json.loads(KEA_CONFIG.read_text())
        return len(d.get("Dhcp4", {}).get("subnet4", []))
    except Exception:
        return 0


@router.get("", response_model=SystemInfo)
async def get_system_info():
    services = []
    for name, label in [("kea-dhcp4", "Kea DHCP4"), ("uvicorn", "Web UI (Backend)")]:
        pid = _find_pid(name)
        rss = _get_proc_rss(pid) if pid else 0
        cpu = _get_cpu_percent(pid)
        services.append(ServiceInfo(
            name=label,
            pid=pid,
            rss_mb=round(rss, 1),
            cpu_percent=cpu,
            status="running" if pid else "stopped",
        ))

    ram_total = sum(s.rss_mb for s in services)

    disk_items = [
        DiskUsage(label="Database (hotspot/reservasi)", size_bytes=_dir_size(DHCP_HUB_DIR / "backend" / "dhcp_hub.db")),
        DiskUsage(label="Lease CSV", size_bytes=_dir_size(KEA_LEASES)),
        DiskUsage(label="Kea Config", size_bytes=_dir_size(KEA_CONFIG)),
        DiskUsage(label="Config Backups", size_bytes=_dir_size(KEA_BACKUPS)),
        DiskUsage(label="Backend Source", size_bytes=_dir_size(DHCP_HUB_DIR / "backend", exclude={"venv", "__pycache__"})),
        DiskUsage(label="Frontend Build", size_bytes=_dir_size(DHCP_HUB_DIR / "frontend" / "dist")),
    ]
    disk_total = sum(d.size_bytes for d in disk_items)

    return SystemInfo(
        uptime_seconds=round(time.time() - START_TIME),
        ram_services_mb=round(ram_total, 1),
        ram_services_detail=services,
        disk_items=disk_items,
        disk_total_bytes=disk_total,
        kea_subnets=_count_kea_subnets(),
        kea_leases=_count_kea_leases(),
    )

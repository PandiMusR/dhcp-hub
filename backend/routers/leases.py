from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Hotspot
from schemas import GlobalStats, LeaseInfo, SubnetStats
from services.kea_api import get_all_leases, get_leases_by_subnet

router = APIRouter(prefix="/api/leases", tags=["leases"])


@router.get("", response_model=list[LeaseInfo])
async def list_leases():
    leases = await get_all_leases()
    return [
        LeaseInfo(
            ip=l.get("ip-address", ""),
            hw_address=l.get("hw-address", ""),
            hostname=l.get("hostname"),
            valid_lifetime=l.get("valid-lft"),
            expire=l.get("expire"),
            subnet_id=l.get("subnet-id"),
            state=l.get("state"),
        )
        for l in leases
    ]


@router.get("/subnet/{subnet_id}", response_model=list[LeaseInfo])
async def list_leases_by_subnet(subnet_id: int):
    leases = await get_leases_by_subnet(subnet_id)
    return [
        LeaseInfo(
            ip=l.get("ip-address", ""),
            hw_address=l.get("hw-address", ""),
            hostname=l.get("hostname"),
            valid_lifetime=l.get("valid-lft"),
            expire=l.get("expire"),
            subnet_id=l.get("subnet-id"),
            state=l.get("state"),
        )
        for l in leases
    ]


@router.get("/stats", response_model=GlobalStats)
async def get_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Hotspot))
    hotspots = result.scalars().all()

    total_subnets = len(hotspots)
    enabled_subnets = sum(1 for h in hotspots if h.enabled)

    all_leases = await get_all_leases()
    total_leases = len(all_leases)

    subnet_stats = []
    for h in hotspots:
        subnet_leases = [l for l in all_leases if l.get("subnet-id") == h.id]
        active = [l for l in subnet_leases if l.get("state") == 0]
        subnet_stats.append(
            SubnetStats(
                subnet_id=h.id,
                subnet=h.subnet,
                total_leases=len(subnet_leases),
                active_leases=len(active),
            )
        )

    active_leases = sum(1 for l in all_leases if l.get("state") == 0)

    return GlobalStats(
        total_subnets=total_subnets,
        enabled_subnets=enabled_subnets,
        total_leases=total_leases,
        active_leases=active_leases,
        subnet_stats=subnet_stats,
    )

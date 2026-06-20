from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Hotspot
from schemas import (
    HotspotCreate,
    HotspotResponse,
    HotspotToggle,
    HotspotUpdate,
)
from services.wireguard import auto_sync_wg_allowed_ips

router = APIRouter(prefix="/api/hotspots", tags=["hotspots"])


@router.get("", response_model=list[HotspotResponse])
async def list_hotspots(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Hotspot).order_by(Hotspot.id))
    return result.scalars().all()


@router.post("", response_model=HotspotResponse, status_code=201)
async def create_hotspot(data: HotspotCreate, db: AsyncSession = Depends(get_db)):
    hotspot = Hotspot(**data.model_dump())
    db.add(hotspot)
    await db.commit()
    await db.refresh(hotspot)
    await auto_sync_wg_allowed_ips(db)
    return hotspot


@router.get("/{hotspot_id}", response_model=HotspotResponse)
async def get_hotspot(hotspot_id: int, db: AsyncSession = Depends(get_db)):
    hotspot = await db.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return hotspot


@router.put("/{hotspot_id}", response_model=HotspotResponse)
async def update_hotspot(
    hotspot_id: int, data: HotspotUpdate, db: AsyncSession = Depends(get_db)
):
    hotspot = await db.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(hotspot, field, value)

    await db.commit()
    await db.refresh(hotspot)
    await auto_sync_wg_allowed_ips(db)
    return hotspot


@router.delete("/{hotspot_id}", status_code=204)
async def delete_hotspot(hotspot_id: int, db: AsyncSession = Depends(get_db)):
    hotspot = await db.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    await db.delete(hotspot)
    await db.commit()
    await auto_sync_wg_allowed_ips(db)


@router.patch("/{hotspot_id}/toggle", response_model=HotspotResponse)
async def toggle_hotspot(
    hotspot_id: int, data: HotspotToggle, db: AsyncSession = Depends(get_db)
):
    hotspot = await db.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    hotspot.enabled = data.enabled
    await db.commit()
    await db.refresh(hotspot)
    await auto_sync_wg_allowed_ips(db)
    return hotspot

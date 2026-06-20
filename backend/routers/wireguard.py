from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import WireGuardConfig
from schemas import (
    WireGuardConfigCreate,
    WireGuardConfigPreview,
    WireGuardConfigResponse,
    WireGuardConfigUpdate,
)
from services.wireguard import apply_wg_config, get_wg_status, init_wg_interface, preview_wg_config, wg_pubkey

router = APIRouter(prefix="/api/wireguard", tags=["wireguard"])


@router.get("", response_model=WireGuardConfigResponse | None)
async def get_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    if not wg:
        return None
    return wg


@router.get("/public-key")
async def get_public_key(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    if not wg:
        raise HTTPException(status_code=404, detail="WireGuard config not found")
    try:
        pub = wg_pubkey(wg.vps_private_key)
        return {"public_key": pub}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/init")
async def init(db: AsyncSession = Depends(get_db)):
    result = await init_wg_interface(db)
    return result


@router.post("", response_model=WireGuardConfigResponse, status_code=201)
async def create_config(data: WireGuardConfigCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(WireGuardConfig))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="WireGuard config already exists. Use PUT to update.")

    wg = WireGuardConfig(**data.model_dump())
    db.add(wg)
    await db.commit()
    await db.refresh(wg)
    return wg


@router.put("", response_model=WireGuardConfigResponse)
async def update_config(data: WireGuardConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    if not wg:
        raise HTTPException(status_code=404, detail="WireGuard config not found. Use POST to create.")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(wg, field, value)

    await db.commit()
    await db.refresh(wg)
    return wg


@router.get("/preview", response_model=WireGuardConfigPreview)
async def preview(db: AsyncSession = Depends(get_db)):
    data = await preview_wg_config(db)
    return WireGuardConfigPreview(**data)


@router.post("/apply")
async def apply(db: AsyncSession = Depends(get_db)):
    result = await apply_wg_config(db)
    return result


@router.get("/status")
async def status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WireGuardConfig))
    wg = result.scalar_one_or_none()
    name = wg.interface_name if wg else "wg1"
    return await get_wg_status(name)

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import ConfigApplyResult, ConfigPreview
from services.kea_config import (
    apply_config,
    get_current_config,
    list_backups,
    preview_config,
    rollback_config,
)

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/preview", response_model=ConfigPreview)
async def config_preview(db: AsyncSession = Depends(get_db)):
    config_str = await preview_config(db)
    return ConfigPreview(config=config_str)


@router.post("/apply", response_model=ConfigApplyResult)
async def config_apply(db: AsyncSession = Depends(get_db)):
    result = await apply_config(db)
    return ConfigApplyResult(**result)


@router.get("/current")
async def config_current():
    config = await get_current_config()
    return {"config": config}


@router.get("/backups")
async def config_backups():
    backups = await list_backups()
    return {"backups": backups}


@router.post("/rollback/{filename}", response_model=ConfigApplyResult)
async def config_rollback(filename: str):
    result = await rollback_config(filename)
    return ConfigApplyResult(**result)

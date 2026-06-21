import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import ConfigApplyResult, ConfigPreview
from services.kea_config import (
    KEA_CONFIG_PATH,
    _reload_kea,
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


class LfcSettings(BaseModel):
    lfc_interval: int
    lfc_interval_label: str


class LfcUpdate(BaseModel):
    lfc_interval: int


LFC_LABELS = {
    3600: "1 jam",
    21600: "6 jam",
    43200: "12 jam",
    86400: "1 hari",
    172800: "2 hari",
    259200: "3 hari",
    604800: "7 hari",
}


def _get_lfc_interval() -> int:
    try:
        d = json.loads(KEA_CONFIG_PATH.read_text())
        return d["Dhcp4"]["lease-database"]["lfc-interval"]
    except Exception:
        return 259200


@router.get("/lfc", response_model=LfcSettings)
async def get_lfc():
    interval = _get_lfc_interval()
    return LfcSettings(
        lfc_interval=interval,
        lfc_interval_label=LFC_LABELS.get(interval, f"{interval} detik"),
    )


@router.put("/lfc", response_model=LfcSettings)
async def update_lfc(body: LfcUpdate):
    if body.lfc_interval < 60 or body.lfc_interval > 2592000:
        raise HTTPException(status_code=400, detail="LFC interval harus antara 60 - 2592000 detik")

    try:
        d = json.loads(KEA_CONFIG_PATH.read_text())
        d["Dhcp4"]["lease-database"]["lfc-interval"] = body.lfc_interval
        KEA_CONFIG_PATH.write_text(json.dumps(d, indent=2))
        _reload_kea()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal update LFC: {e}")

    return LfcSettings(
        lfc_interval=body.lfc_interval,
        lfc_interval_label=LFC_LABELS.get(body.lfc_interval, f"{body.lfc_interval} detik"),
    )

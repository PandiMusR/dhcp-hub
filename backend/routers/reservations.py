from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import HostReservation, Hotspot
from schemas import ReservationCreate, ReservationResponse, ReservationUpdate

router = APIRouter(prefix="/api/hotspots/{hotspot_id}/reservations", tags=["reservations"])


async def _get_hotspot(hotspot_id: int, db: AsyncSession) -> Hotspot:
    hotspot = await db.get(Hotspot, hotspot_id)
    if not hotspot:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return hotspot


@router.get("", response_model=list[ReservationResponse])
async def list_reservations(hotspot_id: int, db: AsyncSession = Depends(get_db)):
    await _get_hotspot(hotspot_id, db)
    result = await db.execute(
        select(HostReservation)
        .where(HostReservation.hotspot_id == hotspot_id)
        .order_by(HostReservation.ip_address)
    )
    return result.scalars().all()


@router.post("", response_model=ReservationResponse, status_code=201)
async def create_reservation(
    hotspot_id: int, data: ReservationCreate, db: AsyncSession = Depends(get_db)
):
    await _get_hotspot(hotspot_id, db)

    existing = await db.execute(
        select(HostReservation).where(
            HostReservation.hotspot_id == hotspot_id,
            HostReservation.hw_address == data.hw_address.upper(),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="MAC address already reserved in this subnet")

    existing_ip = await db.execute(
        select(HostReservation).where(
            HostReservation.hotspot_id == hotspot_id,
            HostReservation.ip_address == data.ip_address,
        )
    )
    if existing_ip.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="IP address already reserved in this subnet")

    reservation = HostReservation(hotspot_id=hotspot_id, **data.model_dump())
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.put("/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    hotspot_id: int,
    reservation_id: int,
    data: ReservationUpdate,
    db: AsyncSession = Depends(get_db),
):
    await _get_hotspot(hotspot_id, db)
    reservation = await db.get(HostReservation, reservation_id)
    if not reservation or reservation.hotspot_id != hotspot_id:
        raise HTTPException(status_code=404, detail="Reservation not found")

    update_data = data.model_dump(exclude_unset=True)
    if "hw_address" in update_data:
        update_data["hw_address"] = update_data["hw_address"].upper()
    for field, value in update_data.items():
        setattr(reservation, field, value)

    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.delete("/{reservation_id}", status_code=204)
async def delete_reservation(
    hotspot_id: int, reservation_id: int, db: AsyncSession = Depends(get_db)
):
    await _get_hotspot(hotspot_id, db)
    reservation = await db.get(HostReservation, reservation_id)
    if not reservation or reservation.hotspot_id != hotspot_id:
        raise HTTPException(status_code=404, detail="Reservation not found")
    await db.delete(reservation)
    await db.commit()

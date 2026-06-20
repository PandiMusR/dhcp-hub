from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Hotspot(Base):
    __tablename__ = "hotspots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    subnet: Mapped[str] = mapped_column(String(18), nullable=False)
    gateway: Mapped[str] = mapped_column(String(15), nullable=False)
    pool_start: Mapped[str] = mapped_column(String(15), nullable=False)
    pool_end: Mapped[str] = mapped_column(String(15), nullable=False)
    dns: Mapped[str] = mapped_column(String(255), nullable=False, default="1.1.1.1, 8.8.8.8")
    lease_time: Mapped[int] = mapped_column(Integer, nullable=False, default=86400)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    reservations: Mapped[list["HostReservation"]] = relationship(
        back_populates="hotspot", cascade="all, delete-orphan"
    )


class HostReservation(Base):
    __tablename__ = "host_reservations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hotspot_id: Mapped[int] = mapped_column(Integer, ForeignKey("hotspots.id"), nullable=False)
    hw_address: Mapped[str] = mapped_column(String(17), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(15), nullable=False)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    hotspot: Mapped["Hotspot"] = relationship(back_populates="reservations")


class WireGuardConfig(Base):
    __tablename__ = "wireguard_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interface_name: Mapped[str] = mapped_column(String(10), nullable=False, default="wg1")
    listen_port: Mapped[int] = mapped_column(Integer, nullable=False, default=51821)
    vps_address: Mapped[str] = mapped_column(String(18), nullable=False, default="10.200.0.1/32")
    vps_private_key: Mapped[str] = mapped_column(String(64), nullable=False)
    router_public_key: Mapped[str] = mapped_column(String(64), nullable=False)
    router_endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    router_address: Mapped[str] = mapped_column(String(18), nullable=False, default="10.200.0.2/32")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

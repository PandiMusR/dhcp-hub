from datetime import datetime
from pydantic import BaseModel, field_validator
import ipaddress


class HotspotCreate(BaseModel):
    name: str
    subnet: str
    gateway: str
    pool_start: str
    pool_end: str
    dns: str = "1.1.1.1, 8.8.8.8"
    lease_time: int = 86400
    enabled: bool = True
    notes: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()

    @field_validator("subnet")
    @classmethod
    def validate_subnet(cls, v: str) -> str:
        try:
            ipaddress.ip_network(v, strict=False)
        except ValueError:
            raise ValueError(f"Invalid subnet: {v}")
        return v

    @field_validator("gateway", "pool_start", "pool_end")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError(f"Invalid IP address: {v}")
        return v

    @field_validator("lease_time")
    @classmethod
    def validate_lease_time(cls, v: int) -> int:
        if v < 60:
            raise ValueError("Lease time must be at least 60 seconds")
        return v


class HotspotUpdate(BaseModel):
    name: str | None = None
    subnet: str | None = None
    gateway: str | None = None
    pool_start: str | None = None
    pool_end: str | None = None
    dns: str | None = None
    lease_time: int | None = None
    enabled: bool | None = None
    notes: str | None = None


class HotspotResponse(BaseModel):
    id: int
    name: str
    subnet: str
    gateway: str
    pool_start: str
    pool_end: str
    dns: str
    lease_time: int
    enabled: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HotspotToggle(BaseModel):
    enabled: bool


class ConfigPreview(BaseModel):
    config: str


class ConfigApply(BaseModel):
    confirm: bool = True


class ConfigApplyResult(BaseModel):
    success: bool
    message: str
    backup_path: str | None = None


class LeaseInfo(BaseModel):
    ip: str
    hw_address: str
    hostname: str | None = None
    valid_lifetime: int | None = None
    expire: str | None = None
    subnet_id: int | None = None
    state: int | None = None


class SubnetStats(BaseModel):
    subnet_id: int
    subnet: str
    total_leases: int
    active_leases: int


class GlobalStats(BaseModel):
    total_subnets: int
    enabled_subnets: int
    total_leases: int
    active_leases: int
    subnet_stats: list[SubnetStats]


class ReservationCreate(BaseModel):
    hw_address: str
    ip_address: str
    hostname: str | None = None
    notes: str | None = None

    @field_validator("hw_address")
    @classmethod
    def validate_mac(cls, v: str) -> str:
        v = v.strip().upper()
        parts = v.split(":")
        if len(parts) != 6 or not all(len(p) == 2 and p.isalnum() for p in parts):
            raise ValueError(f"Invalid MAC address: {v}")
        return v

    @field_validator("ip_address")
    @classmethod
    def validate_ip(cls, v: str) -> str:
        try:
            ipaddress.ip_address(v)
        except ValueError:
            raise ValueError(f"Invalid IP address: {v}")
        return v


class ReservationUpdate(BaseModel):
    hw_address: str | None = None
    ip_address: str | None = None
    hostname: str | None = None
    notes: str | None = None


class ReservationResponse(BaseModel):
    id: int
    hotspot_id: int
    hw_address: str
    ip_address: str
    hostname: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class WireGuardConfigCreate(BaseModel):
    interface_name: str = "wg1"
    listen_port: int = 51821
    vps_address: str = "10.200.0.1/32"
    vps_private_key: str
    router_public_key: str
    router_endpoint: str
    router_address: str = "10.200.0.2/32"

    @field_validator("listen_port")
    @classmethod
    def validate_port(cls, v: int) -> int:
        if v < 1 or v > 65535:
            raise ValueError("Port must be between 1 and 65535")
        return v

    @field_validator("vps_address", "router_address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        if "/" not in v:
            raise ValueError("Address must include CIDR notation (e.g. 10.200.0.1/32)")
        return v


class WireGuardConfigUpdate(BaseModel):
    listen_port: int | None = None
    vps_address: str | None = None
    vps_private_key: str | None = None
    router_public_key: str | None = None
    router_endpoint: str | None = None
    router_address: str | None = None


class WireGuardConfigResponse(BaseModel):
    id: int
    interface_name: str
    listen_port: int
    vps_address: str
    vps_private_key: str
    router_public_key: str
    router_endpoint: str
    router_address: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WireGuardConfigPreview(BaseModel):
    config: str
    allowed_ips: list[str]

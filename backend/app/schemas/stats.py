from pydantic import BaseModel
from typing import Optional

class HardwareTelemetry(BaseModel):
    cpu_percent: float
    cpu_cores_logical: int
    cpu_cores_physical: int
    memory_used_gb: float
    memory_total_gb: float
    memory_percent: float
    temperature_c: float
    uptime_seconds: float
    uptime_formatted: str
    disk_used_gb: float
    disk_total_gb: float
    disk_percent: float
    platform_os: str
    server_node: str

class ServiceStatus(BaseModel):
    name: str
    status: str  # "operational" | "degraded" | "down"
    latency_ms: float
    details: str

class SystemStatusResponse(BaseModel):
    status: str  # "operational" | "degraded" | "down"
    timestamp: str
    overall_latency_ms: float
    hardware: HardwareTelemetry
    services: list[ServiceStatus]

class SiteInfo(BaseModel):
    name: str
    tagline: str
    description: str
    url: str
    total_posts: int

class SystemStats(BaseModel):
    status: str = "healthy"
    database_connected: bool = True
    app_version: str = "1.0.0"


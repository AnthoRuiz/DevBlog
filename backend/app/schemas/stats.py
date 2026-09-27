from pydantic import BaseModel

class StreakStats(BaseModel):
    current_streak_days: int
    total_articles_published: int
    total_views: int
    total_upvotes: int
    homelab_uptime_percent: float = 99.98
    server_node: str = "Homelab Docker (Ubuntu 22.04)"

class SystemStats(BaseModel):
    status: str = "healthy"
    database_connected: bool = True
    app_version: str = "1.0.0"

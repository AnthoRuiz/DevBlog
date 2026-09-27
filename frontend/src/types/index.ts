export type UserRole = 'ADMIN' | 'AUTHOR' | 'READER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id?: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Post {
  id: string;
  author_id?: string;
  slug: string;
  title: string;
  summary: string;
  cover_image_url?: string;
  language: string;
  reading_time_minutes: number;
  upvotes_count: number;
  views_count: number;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  tags: Tag[];
}

export interface PostDetail extends Post {
  content_markdown: string;
  comments: Comment[];
}

export interface PostUpdate {
  title?: string;
  summary?: string;
  content_markdown?: string;
  cover_image_url?: string;
  language?: string;
  reading_time_minutes?: number;
  is_published?: boolean;
  tag_ids?: string[];
}

export interface HardwareTelemetry {
  cpu_percent: number;
  cpu_cores_logical: number;
  cpu_cores_physical: number;
  memory_used_gb: number;
  memory_total_gb: number;
  memory_percent: number;
  temperature_c: number;
  uptime_seconds: number;
  uptime_formatted: string;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_percent: number;
  platform_os: string;
  server_node: string;
}

export interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency_ms: number;
  details: string;
}

export interface SystemStatusResponse {
  status: 'operational' | 'degraded' | 'down';
  timestamp: string;
  overall_latency_ms: number;
  hardware: HardwareTelemetry;
  services: ServiceStatus[];
}

export interface StreakStats {
  current_streak_days: number;
  total_articles_published: number;
  total_views: number;
  total_upvotes: number;
  homelab_uptime_percent: number;
  server_node: string;
  telemetry?: HardwareTelemetry;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'ADMIN' | 'AUTHOR' | 'READER';
}

export interface BackupItem {
  filename: string;
  size_bytes: number;
  size_display: string;
  created_at: string;
}

export interface BackupsResponse {
  status: string;
  retention_policy: string;
  retention_limit: number;
  total_backups: number;
  backups: BackupItem[];
}

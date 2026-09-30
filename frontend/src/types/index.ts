// Anonymous visitors are the readers; every account is a creator, admins manage the site
export type UserRole = 'ADMIN' | 'CREATOR';

export type PostStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  // Trusted creators publish without admin review
  is_trusted: boolean;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export type SectionIcon = 'code' | 'cpu' | 'target' | 'heart' | 'gamepad';

export interface Section {
  id: string;
  name: string;
  slug: string;
  description: string;
  color_hex: string;
  icon: SectionIcon | string;
  sort_order: number;
}

export interface SectionWithCount extends Section {
  post_count: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
  section_id: string;
}

export interface AIStatus {
  available: boolean;
  // Configured providers in failover order, e.g. ['claude', 'gemini']
  providers: string[];
}

export interface TagSuggestions {
  tags: string[];
  // e.g. 'claude:claude-opus-5-5', or 'keywords' when no AI provider was available
  provider: string;
  // Why keywords were used: 'not_configured' | 'quota_exhausted' | 'failed'
  fallbackReason: string | null;
}

export interface TagValidation {
  name: string;
  existing_tag: Tag | null;
  suggested_section: Section | null;
  matches_selected: boolean;
  blocked: boolean;
  confidence: number;
  reason: string;
  source: 'gemini' | 'keywords' | 'none' | string;
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
  status: PostStatus;
  // Reason given by the admin when the post was rejected
  review_note?: string | null;
  published_at?: string;
  created_at: string;
  section?: Section | null;
  tags: Tag[];
}

// A post waiting for admin review, with who wrote it
export interface ReviewItem extends Post {
  author_name?: string | null;
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
  // true: publish or submit for review; false: back to draft
  submit?: boolean;
  section_id?: string;
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

export interface BackupItem {
  filename: string;
  size_bytes: number;
  size_display: string;
  created_at: string;
  // Paired archive of uploaded media (null for backups made before media archiving)
  media_filename?: string | null;
  media_size_bytes?: number;
  media_size_display?: string;
}

export interface PostPage {
  items: Post[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface MediaStats {
  total_files: number;
  total_size_display: string;
  orphan_files: number;
  orphan_size_display: string;
  orphans: string[];
  recent_unreferenced: number;
  grace_hours: number;
}

export interface MediaCleanupResult {
  deleted: string[];
  deleted_count: number;
  freed_display: string;
}

export interface BackupsResponse {
  status: string;
  retention_policy: string;
  retention_limit: number;
  total_backups: number;
  backups: BackupItem[];
}

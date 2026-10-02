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
  // Visual personality of the section's posts
  theme: SectionTheme;
  // Admin-editable markdown shown below every post of the section
  footer_markdown: string;
}

export type SectionTheme = 'default' | 'calm' | 'vivid';

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
  // Optional notice shown before the body ("This post discusses anxiety")
  content_notice?: string | null;
  language: string;
  reading_time_minutes: number;
  upvotes_count: number;
  views_count: number;
  status: PostStatus;
  // Reason given by the admin when the post was rejected
  review_note?: string | null;
  // Set while the admin features the post in its section (max two per section)
  featured_at?: string | null;
  // "ai" for drafts written by the AI writer (kept internally after the admin adopts them)
  origin?: 'human' | 'ai';
  // Unsplash attribution shown under the cover
  cover_credit?: { id: string; name: string; profile_url: string; photo_url: string } | null;
  series_id?: string | null;
  series_position?: number | null;
  published_at?: string;
  created_at: string;
  section?: Section | null;
  tags: Tag[];
}

// A post waiting for admin review, with who wrote it
export interface ReviewItem extends Post {
  author_name?: string | null;
  // AI drafts only: what the writer researched and wants the admin to check
  ai_meta?: {
    topic?: string;
    sources?: { title: string; url: string }[];
    editor_notes?: string[];
    providers?: { research?: string; writing?: string };
    generated_at?: string;
    regenerating?: boolean;
    regenerate_error?: string | null;
    last_feedback?: string;
  } | null;
}

export interface AIDraftRun {
  id: string;
  run_date: string;
  trigger: 'schedule' | 'retry' | 'manual';
  status: 'running' | 'succeeded' | 'partial' | 'failed' | 'skipped';
  detail: string;
  post_ids: string[];
  started_at: string;
  finished_at: string | null;
}

// GET /admin/ai-drafts/status
export interface AIDraftsStatus {
  enabled: boolean;
  max_pending: number;
  sections: string[];
  schedule_time: string;
  timezone: string;
  next_run_at: string;
  pending: number;
  running: boolean;
  providers: string[];
  unsplash_configured: boolean;
  recent_runs: AIDraftRun[];
}

export interface PostDetail extends Post {
  content_markdown: string;
  comments: Comment[];
  // "Part N of M" (readers only count published posts)
  series?: PostSeriesInfo | null;
}

export interface PostSeriesInfo {
  id: string;
  slug: string;
  title: string;
  position: number;
  total: number;
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

// An ordered learning path of posts within one section
export interface Series {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image_url?: string | null;
  created_by?: string | null;
  created_at: string;
  section: Section;
  post_count: number;
}

// GET /posts/home: everything the magazine home needs
export interface HomeData {
  featured: Post | null;
  latest: Post[];
  sections: { section: SectionWithCount; lead: Post | null; rest: Post[] }[];
}

export interface SeriesDetail extends Series {
  posts: Post[];
  can_edit: boolean;
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
  // null takes the post out of its series
  series_id?: string | null;
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

export interface SiteInfo {
  name: string;
  tagline: string;
  description: string;
  url: string;
  total_posts: number;
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

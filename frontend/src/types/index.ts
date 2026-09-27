export interface Tag {
  id: string;
  name: string;
  slug: string;
  color_hex: string;
}

export interface Post {
  id: string;
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
}

export interface StreakStats {
  current_streak_days: number;
  total_articles_published: number;
  total_views: number;
  total_upvotes: number;
  homelab_uptime_percent: number;
  server_node: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'ADMIN' | 'AUTHOR' | 'READER';
}

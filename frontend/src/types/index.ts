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

import { Post, PostDetail, StreakStats, Tag } from '../types';

const API_BASE = '/api/v1';

export async function fetchStreakStats(): Promise<StreakStats> {
  const res = await fetch(`${API_BASE}/stats/streak`);
  if (!res.ok) throw new Error('Error al obtener estadísticas de racha');
  return res.json();
}

export async function fetchPosts(tag?: string, sort: string = 'recent', query?: string): Promise<Post[]> {
  const params = new URLSearchParams();
  if (tag) params.append('tag', tag);
  if (sort) params.append('sort', sort);
  if (query) params.append('q', query);

  const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error('Error al obtener artículos');
  return res.json();
}

export async function fetchPostBySlug(slug: string): Promise<PostDetail> {
  const res = await fetch(`${API_BASE}/posts/${slug}`);
  if (!res.ok) throw new Error('Artículo no encontrado');
  return res.json();
}

export async function toggleUpvote(postId: string): Promise<{ upvoted: boolean; new_upvotes_count: number }> {
  const res = await fetch(`${API_BASE}/posts/${postId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Error al registrar upvote');
  return res.json();
}

export async function fetchAllTags(): Promise<Tag[]> {
  const res = await fetch(`${API_BASE}/posts/tags/all`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadImage(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/posts/upload-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Error al subir la imagen' }));
    throw new Error(errorData.detail || 'Error al subir la imagen');
  }

  const data = await res.json();
  return data.url;
}

export async function createPost(
  postData: {
    title: string;
    summary: string;
    language: string;
    content_markdown: string;
    cover_image_url?: string;
    reading_time_minutes: number;
    tag_ids: string[];
    is_published: boolean;
  },
  token: string
): Promise<PostDetail> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error creando artículo' }));
    throw new Error(err.detail || 'Error creando artículo');
  }

  return res.json();
}

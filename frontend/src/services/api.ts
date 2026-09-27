import { Post, PostDetail, StreakStats, Tag, Comment, HardwareTelemetry, SystemStatusResponse } from '../types';

const API_BASE = '/api/v1';

export async function fetchStreakStats(): Promise<StreakStats> {
  const res = await fetch(`${API_BASE}/stats/streak`);
  if (!res.ok) throw new Error('Error al obtener estadísticas de racha');
  return res.json();
}

export async function fetchLiveTelemetry(): Promise<HardwareTelemetry> {
  const res = await fetch(`${API_BASE}/stats/telemetry`);
  if (!res.ok) throw new Error('Error al obtener telemetría de hardware');
  return res.json();
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const res = await fetch(`${API_BASE}/stats/status`);
  if (!res.ok) throw new Error('Error al obtener estado del sistema');
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

export async function fetchBookmarkedPosts(): Promise<Post[]> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/posts/bookmarks/mine`, { headers });
  if (!res.ok) throw new Error('Error al obtener artículos guardados');
  return res.json();
}

export async function fetchPostBySlug(slug: string): Promise<PostDetail> {
  const res = await fetch(`${API_BASE}/posts/${slug}`);
  if (!res.ok) throw new Error('Artículo no encontrado');
  return res.json();
}

export async function toggleUpvote(postId: string): Promise<{ upvoted: boolean; new_upvotes_count: number }> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/posts/${postId}/upvote`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Error al registrar upvote');
  return res.json();
}

export async function toggleBookmark(postId: string): Promise<{ post_id: string; is_bookmarked: boolean }> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/posts/${postId}/bookmark`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Error al guardar marcador');
  return res.json();
}

export async function fetchAllTags(): Promise<Tag[]> {
  const res = await fetch(`${API_BASE}/posts/tags/all`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
  if (!res.ok) return [];
  return res.json();
}

export async function createComment(
  postId: string,
  content: string,
  authorName?: string,
  token?: string
): Promise<Comment> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, author_name: authorName || 'Dev Reader' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al publicar comentario' }));
    throw new Error(err.detail || 'Error al publicar comentario');
  }

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
    reading_time_minutes?: number;
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

export async function updatePost(
  postId: string,
  postData: {
    title?: string;
    summary?: string;
    language?: string;
    content_markdown?: string;
    cover_image_url?: string;
    reading_time_minutes?: number;
    tag_ids?: string[];
    is_published?: boolean;
  },
  token: string
): Promise<PostDetail> {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(postData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error actualizando artículo' }));
    throw new Error(err.detail || 'Error actualizando artículo');
  }

  return res.json();
}

export async function deletePost(postId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error eliminando artículo' }));
    throw new Error(err.detail || 'Error eliminando artículo');
  }
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<{ access_token: string; user: { email: string; full_name: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al registrar usuario' }));
    throw new Error(err.detail || 'Error al registrar usuario');
  }

  return res.json();
}

export interface TranslatePostResponse {
  title: string;
  summary: string;
  content_markdown: string;
  target_lang: string;
  provider: string;
}

export async function translatePostWithAi(
  data: {
    title: string;
    summary: string;
    content_markdown: string;
    target_lang: string;
    source_lang?: string;
  },
  token: string
): Promise<TranslatePostResponse> {
  const res = await fetch(`${API_BASE}/posts/ai-translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al traducir con IA' }));
    throw new Error(err.detail || 'Error al traducir con IA');
  }

  return res.json();
}

export async function createTag(
  name: string,
  token: string,
  colorHex?: string
): Promise<Tag> {
  const res = await fetch(`${API_BASE}/posts/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, color_hex: colorHex || '#38bdf8' }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al crear la etiqueta' }));
    throw new Error(err.detail || 'Error al crear la etiqueta');
  }

  return res.json();
}

export async function suggestTagsWithAi(
  title: string,
  summary: string,
  contentMarkdown: string,
  token: string
): Promise<string[]> {
  const res = await fetch(`${API_BASE}/posts/ai-suggest-tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      summary,
      content_markdown: contentMarkdown,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al sugerir etiquetas con IA' }));
    throw new Error(err.detail || 'Error al sugerir etiquetas con IA');
  }

  const data = await res.json();
  return data.suggested_tags || [];
}

import { Post, PostDetail, StreakStats, Tag, Comment, HardwareTelemetry, SystemStatusResponse, User, UserRole, BackupItem, BackupsResponse } from '../types';

const API_BASE = '/api/v1';

// Role switcher for local testing. Also requires ALLOW_ROLE_SELF_SWITCH=True on the backend.
export const ROLE_TESTING_ENABLED = import.meta.env.VITE_ENABLE_ROLE_TESTING === 'true';

export async function fetchStreakStats(): Promise<StreakStats> {
  const res = await fetch(`${API_BASE}/stats/streak`);
  if (!res.ok) throw new Error('Failed to load streak stats');
  return res.json();
}

// ADMIN only
export async function fetchLiveTelemetry(token: string): Promise<HardwareTelemetry> {
  const res = await fetch(`${API_BASE}/stats/telemetry`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load hardware telemetry');
  return res.json();
}

// ADMIN only
export async function fetchSystemStatus(token: string): Promise<SystemStatusResponse> {
  const res = await fetch(`${API_BASE}/stats/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load system status');
  return res.json();
}

// Public availability ping (no hardware metrics)
export async function pingSystemHealth(): Promise<void> {
  const res = await fetch(`${API_BASE}/stats/system`);
  if (!res.ok) throw new Error('Server unavailable');
}

export async function fetchPosts(tag?: string, sort: string = 'recent', query?: string): Promise<Post[]> {
  const params = new URLSearchParams();
  if (tag) params.append('tag', tag);
  if (sort) params.append('sort', sort);
  if (query) params.append('q', query);

  const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

export async function fetchBookmarkedPosts(): Promise<Post[]> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/posts/bookmarks/mine`, { headers });
  if (!res.ok) throw new Error('Failed to load bookmarked posts');
  return res.json();
}

export async function fetchPostBySlug(slug: string): Promise<PostDetail> {
  const res = await fetch(`${API_BASE}/posts/${slug}`);
  if (!res.ok) throw new Error('Post not found');
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
  if (!res.ok) throw new Error('Failed to register upvote');
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
  if (!res.ok) throw new Error('Failed to save bookmark');
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
    const err = await res.json().catch(() => ({ detail: 'Failed to post comment' }));
    throw new Error(err.detail || 'Failed to post comment');
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
    const errorData = await res.json().catch(() => ({ detail: 'Failed to upload image' }));
    throw new Error(errorData.detail || 'Failed to upload image');
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
    const err = await res.json().catch(() => ({ detail: 'Failed to create post' }));
    throw new Error(err.detail || 'Failed to create post');
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
    const err = await res.json().catch(() => ({ detail: 'Failed to update post' }));
    throw new Error(err.detail || 'Failed to update post');
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
    const err = await res.json().catch(() => ({ detail: 'Failed to delete post' }));
    throw new Error(err.detail || 'Failed to delete post');
  }
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Invalid or expired session');
  return res.json();
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
    throw new Error(err.detail || 'Invalid credentials');
  }
  return res.json();
}

export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<{ access_token: string; token_type: string; user: User }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to register user' }));
    throw new Error(err.detail || 'Failed to register user');
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
    const err = await res.json().catch(() => ({ detail: 'AI translation failed' }));
    throw new Error(err.detail || 'AI translation failed');
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
    const err = await res.json().catch(() => ({ detail: 'Failed to create tag' }));
    throw new Error(err.detail || 'Failed to create tag');
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
    const err = await res.json().catch(() => ({ detail: 'AI tag suggestion failed' }));
    throw new Error(err.detail || 'AI tag suggestion failed');
  }

  const data = await res.json();
  return data.suggested_tags || [];
}

export async function fetchAdminBackups(token: string): Promise<BackupsResponse> {
  const res = await fetch(`${API_BASE}/admin/backups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load backups' }));
    throw new Error(err.detail || 'Failed to load backups');
  }
  return res.json();
}

export async function createAdminBackup(
  token: string
): Promise<{ message: string; backup: BackupItem }> {
  const res = await fetch(`${API_BASE}/admin/backups/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create backup' }));
    throw new Error(err.detail || 'Failed to create backup');
  }
  return res.json();
}

export async function downloadAdminBackup(filename: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/backups/${encodeURIComponent(filename)}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to download the database backup');
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteAdminBackup(
  filename: string,
  token: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/admin/backups/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete backup' }));
    throw new Error(err.detail || 'Failed to delete backup');
  }
  return res.json();
}

export async function updateMyRole(role: UserRole, token: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/me/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to change role' }));
    throw new Error(err.detail || 'Failed to change role');
  }
  return res.json();
}

export async function fetchUsers(token: string): Promise<User[]> {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load users' }));
    throw new Error(err.detail || 'Failed to load users');
  }
  return res.json();
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  token: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update user role' }));
    throw new Error(err.detail || 'Failed to update user role');
  }
  return res.json();
}



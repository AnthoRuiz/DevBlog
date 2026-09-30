import { Post, PostDetail, Tag, Comment, HardwareTelemetry, SystemStatusResponse, User, UserRole, BackupItem, BackupsResponse, MediaStats, MediaCleanupResult, PostPage, SectionWithCount, Section, TagValidation, AIStatus, TagSuggestions, ReviewItem } from '../types';

const API_BASE = '/api/v1';

// Role switcher for local testing. Also requires ALLOW_ROLE_SELF_SWITCH=True on the backend.
export const ROLE_TESTING_ENABLED = import.meta.env.VITE_ENABLE_ROLE_TESTING === 'true';

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

export const POSTS_PAGE_SIZE = 12;

export interface PostQuery {
  section?: string;
  tag?: string;
  sort?: string;
  query?: string;
  offset?: number;
  limit?: number;
}

export async function fetchPosts({
  section,
  tag,
  sort = 'recent',
  query,
  offset = 0,
  limit = POSTS_PAGE_SIZE,
}: PostQuery = {}): Promise<PostPage> {
  const params = new URLSearchParams();
  if (section) params.append('section', section);
  if (tag) params.append('tag', tag);
  if (sort) params.append('sort', sort);
  if (query) params.append('q', query);
  params.append('offset', String(offset));
  params.append('limit', String(limit));

  const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load posts');
  return res.json();
}

export async function fetchSections(): Promise<SectionWithCount[]> {
  const res = await fetch(`${API_BASE}/sections`);
  if (!res.ok) throw new Error('Failed to load sections');
  return res.json();
}

// ADMIN only
export async function updateSection(
  sectionId: string,
  data: { name?: string; description?: string; color_hex?: string },
  token: string
): Promise<Section> {
  const res = await fetch(`${API_BASE}/admin/sections/${sectionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update section' }));
    throw new Error(err.detail || 'Failed to update section');
  }
  return res.json();
}

// Checks whether a new tag name fits the selected section (AI providers or keyword classifier)
export async function validateTagSection(name: string, sectionId: string, token: string): Promise<TagValidation> {
  const res = await fetch(`${API_BASE}/posts/tags/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, section_id: sectionId }),
  });
  if (!res.ok) throw new Error('Failed to validate tag');
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
  // Signed-in authors and admins can also open unpublished posts (drafts, in review, rejected)
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE}/posts/${slug}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
    section_id: string;
    // true: publish (admins, trusted creators) or submit for review; false: save as draft
    submit: boolean;
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
    section_id?: string;
    submit?: boolean;
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

// AI feature failure with a machine-readable code (ai_quota_exhausted | ai_not_configured | ai_failed)
export class AIUnavailableError extends Error {
  constructor(message: string, public code: string, public retryAfter: number | null) {
    super(message);
    this.name = 'AIUnavailableError';
  }
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
    if (err.detail && typeof err.detail === 'object' && err.detail.code) {
      throw new AIUnavailableError(err.detail.message, err.detail.code, err.detail.retry_after ?? null);
    }
    throw new Error(err.detail || 'AI translation failed');
  }

  return res.json();
}

export async function createTag(
  name: string,
  sectionId: string,
  token: string,
  options: { colorHex?: string; force?: boolean } = {}
): Promise<Tag> {
  const res = await fetch(`${API_BASE}/posts/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      section_id: sectionId,
      color_hex: options.colorHex || '#38bdf8',
      force: options.force ?? false,
    }),
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
): Promise<TagSuggestions> {
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
  return { tags: data.suggested_tags || [], provider: data.provider || 'keywords', fallbackReason: data.fallback_reason ?? null };
}

export async function fetchAIStatus(token: string): Promise<AIStatus> {
  const res = await fetch(`${API_BASE}/posts/ai-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load AI status');
  return res.json();
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
    throw new Error('Failed to download the backup file');
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

export async function fetchMediaStats(token: string): Promise<MediaStats> {
  const res = await fetch(`${API_BASE}/admin/media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to load media stats' }));
    throw new Error(err.detail || 'Failed to load media stats');
  }
  return res.json();
}

export async function cleanupMedia(token: string): Promise<MediaCleanupResult> {
  const res = await fetch(`${API_BASE}/admin/media/cleanup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to clean up media' }));
    throw new Error(err.detail || 'Failed to clean up media');
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

async function authJson<T>(path: string, token: string, fallback: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: fallback }));
    throw new Error(typeof err.detail === 'string' ? err.detail : fallback);
  }
  return res.json();
}

export function fetchMyPosts(token: string): Promise<Post[]> {
  return authJson('/posts/mine', token, 'Failed to load your posts');
}

export function fetchReviewQueue(token: string): Promise<ReviewItem[]> {
  return authJson('/admin/review', token, 'Failed to load the review queue');
}

export async function fetchReviewCount(token: string): Promise<number> {
  const data = await authJson<{ pending: number }>('/admin/review/count', token, 'Failed to load the review count');
  return data.pending;
}

export function approvePost(postId: string, token: string): Promise<Post> {
  return authJson(`/admin/posts/${postId}/approve`, token, 'Failed to approve the post', { method: 'POST' });
}

export function rejectPost(postId: string, reason: string, token: string): Promise<Post> {
  return authJson(`/admin/posts/${postId}/reject`, token, 'Failed to reject the post', {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function updateUserTrusted(userId: string, isTrusted: boolean, token: string): Promise<User> {
  return authJson(`/auth/users/${userId}/trusted`, token, 'Failed to update the user', {
    method: 'PUT',
    body: JSON.stringify({ is_trusted: isTrusted }),
  });
}

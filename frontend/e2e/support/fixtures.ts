import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

export { expect };

type Json = Record<string, any>;

function devEnv(): Record<string, string> {
  const envFile = resolve(process.cwd(), '..', '.env.dev');
  if (!existsSync(envFile)) return {};
  return Object.fromEntries(
    readFileSync(envFile, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
  );
}

function adminCredentials(): { email: string; password: string } {
  if (process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD) {
    return { email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD };
  }
  const env = devEnv();
  if (!env.ADMIN_EMAIL) throw new Error('Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD or create ../.env.dev');
  return { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD };
}

// Tokens are cached for the whole run: login is rate limited (10/min per IP)
const tokenCache: { admin?: string; creator?: string } = {};

// A fixed creator account, registered on first use, so test runs do not pile up users
const CREATOR = { email: 'e2e-creator@example.com', password: 'E2e!creator-pass-123', full_name: 'E2E Creator' };

/** Dev API helper: authenticated calls plus automatic cleanup of everything a test creates. */
export class Api {
  adminToken = '';
  private created: { posts: string[]; series: string[]; ideas: string[] } = { posts: [], series: [], ideas: [] };

  private request: APIRequestContext;

  // No parameter properties: Node's built-in TypeScript stripping does not support them
  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async init() {
    tokenCache.admin ??= (await this.call('POST', '/auth/login', adminCredentials())).access_token;
    this.adminToken = tokenCache.admin as string;
  }

  async call(method: string, path: string, data?: Json, token?: string): Promise<any> {
    const res = await this.request.fetch(`/api/v1${path}`, {
      method,
      data,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok()) throw new Error(`${method} ${path} -> ${res.status()} ${await res.text()}`);
    return res.status() === 204 ? null : res.json();
  }

  async creatorToken(): Promise<string> {
    if (!tokenCache.creator) {
      try {
        tokenCache.creator = (await this.call('POST', '/auth/login', { email: CREATOR.email, password: CREATOR.password })).access_token;
      } catch {
        tokenCache.creator = (await this.call('POST', '/auth/register', CREATOR)).access_token;
      }
    }
    return tokenCache.creator as string;
  }

  async section(slug: string): Promise<Json> {
    const sections = await this.call('GET', '/sections');
    return sections.find((s: Json) => s.slug === slug);
  }

  /** Create a post (published by default when made by the admin). */
  async createPost(fields: Json & { section: string }, token = this.adminToken): Promise<Json> {
    const { section, ...rest } = fields;
    const post = await this.call(
      'POST',
      '/posts',
      { summary: 'E2E summary', content_markdown: 'E2E body text.', tag_ids: [], submit: true, ...rest, section_id: (await this.section(section)).id },
      token
    );
    this.created.posts.push(post.id);
    return post;
  }

  async createSeries(title: string, section: string): Promise<Json> {
    const series = await this.call('POST', '/series', { title, section_id: (await this.section(section)).id }, this.adminToken);
    this.created.series.push(series.id);
    return series;
  }

  /** Post a writing idea through the ingest endpoint (needs AI_DRAFTS_API_KEY in ../.env.dev); no AI quota used. */
  async ingestIdea(fields: Json & { section_slug: string }): Promise<Json> {
    const key = process.env.E2E_AI_DRAFTS_API_KEY ?? devEnv().AI_DRAFTS_API_KEY;
    if (!key) throw new Error('Set AI_DRAFTS_API_KEY in ../.env.dev');
    const res = await this.request.fetch('/api/v1/ideas/ingest', {
      method: 'POST',
      headers: { 'X-API-Key': key },
      data: {
        hook: 'Why this matters right now, in two sentences for the e2e test.',
        language: 'en',
        angles: ['Angle one', 'Angle two'],
        outline: [{ heading: 'Setting it up', guidance: 'Explain the setup.', prompts: ['What broke first?'] }],
        questions: ['When did this bite you?'],
        experiment: 'Measure it before and after.',
        tags: [],
        sources: [{ title: 'Example source', url: 'https://example.com/article' }],
        ...fields,
      },
    });
    if (!res.ok()) throw new Error(`ingest -> ${res.status()} ${await res.text()}`);
    const idea = await res.json();
    this.created.ideas.push(idea.id);
    return idea;
  }

  /** Track a post created by the app (e.g. "Start writing") so it is deleted after the test */
  trackPost(id: string) {
    this.created.posts.push(id);
  }

  async cleanup() {
    for (const id of this.created.posts) await this.call('DELETE', `/posts/${id}`, undefined, this.adminToken).catch(() => {});
    for (const id of this.created.series) await this.call('DELETE', `/series/${id}`, undefined, this.adminToken).catch(() => {});
    // Dismissed ideas no longer count against the daily job's limit
    for (const id of this.created.ideas) await this.call('POST', `/admin/ideas/${id}/dismiss`, undefined, this.adminToken).catch(() => {});
  }
}

export const test = base.extend<{ api: Api }>({
  api: async ({ request }, use) => {
    const api = new Api(request);
    await api.init();
    await use(api);
    await api.cleanup();
  },
});

/** Sign the browser in by seeding the token the app reads from localStorage. */
export async function signIn(page: Page, token: string) {
  await page.addInitScript((value) => window.localStorage.setItem('auth_token', value), token);
}

/** Unique suffix so test data never collides with existing posts. */
export const stamp = () => Date.now().toString(36);

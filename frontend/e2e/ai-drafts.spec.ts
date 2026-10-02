import { test, expect, signIn, stamp } from './support/fixtures';

// AI drafts: banner and menu badge, review tab, approve as the admin's own post
test('an AI draft is announced, reviewed and published as the admin', async ({ page, api }) => {
  const title = `E2E AI draft ${stamp()}`;
  const draft = await api.ingestDraft({ title, section_slug: 'tech' });
  expect(draft.status).toBe('pending_review');
  await signIn(page, api.adminToken);

  await page.goto('/');
  const banner = page.getByText(/borrador\(es\) de IA esperando tu revisión/);
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Revisar' }).click();
  await expect(page).toHaveURL(/\/admin\/backups\?tab=ai$/);

  const card = page.locator('li', { hasText: title });
  await expect(card.getByText('Example source')).toBeVisible();
  await card.getByRole('button', { name: /Approve & publish as mine/ }).click();
  await expect(page.getByText(/as your post\./)).toBeVisible();

  // Published under the admin's name
  const me = await api.call('GET', '/auth/me', undefined, api.adminToken);
  const post = await api.call('GET', `/posts/${draft.slug}`);
  expect(post.status).toBe('published');
  expect(post.author_id).toBe(me.id);
  expect(post.content_markdown).toContain('## Sources');
});

test('the ingest endpoint rejects a wrong key and Mental Health', async ({ request, api }) => {
  const wrongKey = await request.fetch('/api/v1/ai-drafts/ingest', {
    method: 'POST',
    headers: { 'X-API-Key': 'wrong' },
    data: { title: 'x'.repeat(10), summary: 'y'.repeat(20), content_markdown: 'z'.repeat(120), language: 'en', section_slug: 'tech' },
  });
  expect(wrongKey.status()).toBe(401);
  // Mental Health is personal experience only
  await expect(api.ingestDraft({ title: `E2E AI mental ${stamp()}`, section_slug: 'mental-health' })).rejects.toThrow(/400/);
});

import { test, expect, stamp } from './support/fixtures';

// Section personality on the post page (Phase G): any section can be calm and carry a footer
test('a calm section shows the calm theme, the notice and its footer', async ({ page, api }) => {
  const career = await api.section('career');
  await api.call('PUT', `/admin/sections/${career.id}`, { theme: 'calm', footer_markdown: '[E2E footer link](https://example.com/e2e)' }, api.adminToken);
  try {
    const post = await api.createPost({
      title: `E2E calm ${stamp()}`,
      section: 'career',
      content_markdown: '## Sleep first\n\nA paragraph.',
      content_notice: 'This post discusses layoffs.',
    });
    await page.goto(`/posts/${post.slug}`);
    await expect(page.locator('article.theme-calm')).toBeVisible();
    await expect(page.getByRole('note')).toContainText('This post discusses layoffs.');
    await expect(page.locator('aside.section-footer a[href="https://example.com/e2e"]')).toBeVisible();

    await page.getByRole('button', { name: 'Ocultar aviso' }).click();
    await expect(page.getByRole('note')).toHaveCount(0);
  } finally {
    await api.call('PUT', `/admin/sections/${career.id}`, { theme: career.theme, footer_markdown: career.footer_markdown ?? '' }, api.adminToken);
  }
});

test('tech posts keep the default theme and have no section footer', async ({ page, api }) => {
  const post = await api.createPost({ title: `E2E default ${stamp()}`, section: 'tech' });
  await page.goto(`/posts/${post.slug}`);
  await expect(page.locator('article.theme-default')).toBeVisible();
  await expect(page.locator('aside.section-footer')).toHaveCount(0);
});

test('code blocks with blank lines stay in one block', async ({ page, api }) => {
  const post = await api.createPost({
    title: `E2E code ${stamp()}`,
    section: 'tech',
    content_markdown: 'Intro.\n\n```python\ndef a():\n    return 1\n\n\ndef b():\n    return 2\n```\n\nOutro.',
  });
  await page.goto(`/posts/${post.slug}`);
  const code = page.locator('article pre');
  await expect(code).toHaveCount(1);
  await expect(code).toContainText('def a()');
  await expect(code).toContainText('def b()');
  await expect(page.getByText('Outro.')).toBeVisible();
});

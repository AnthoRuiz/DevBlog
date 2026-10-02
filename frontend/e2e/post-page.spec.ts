import { test, expect, stamp } from './support/fixtures';

// Section personality on the post page (Phase G)
test('mental health posts use the calm theme, notice and disclaimer footer', async ({ page, api }) => {
  const post = await api.createPost({
    title: `E2E calm ${stamp()}`,
    section: 'mental-health',
    content_markdown: '## Sleep first\n\nA paragraph.',
    content_notice: 'This post discusses burnout.',
  });
  await page.goto(`/posts/${post.slug}`);
  await expect(page.locator('article.theme-calm')).toBeVisible();
  await expect(page.getByRole('note')).toContainText('This post discusses burnout.');
  await expect(page.locator('aside.section-footer a[href="https://findahelpline.com"]')).toBeVisible();

  await page.getByRole('button', { name: 'Ocultar aviso' }).click();
  await expect(page.getByRole('note')).toHaveCount(0);
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

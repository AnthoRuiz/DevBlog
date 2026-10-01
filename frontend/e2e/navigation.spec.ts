import { test, expect, stamp } from './support/fixtures';

// Routes, history and 404s (Phase C). The UI defaults to Spanish.
test.describe('navigation', () => {
  test('home shows the magazine layout and the full post list', async ({ page, api }) => {
    await api.createPost({ title: `E2E home ${stamp()}`, section: 'tech' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Todos los posts/ })).toBeVisible();
    await expect(page.locator('main article').first()).toBeVisible();
    await expect(page).toHaveTitle(/Anthony Ruiz/);
  });

  test('section, post page and back/forward', async ({ page, api }) => {
    const post = await api.createPost({ title: `E2E nav ${stamp()}`, section: 'gaming' });
    await page.goto('/');
    await page.getByRole('navigation', { name: /secciones/i }).getByRole('button', { name: /Gaming/ }).click();
    await expect(page).toHaveURL(/\/gaming$/);
    await expect(page).toHaveTitle(/^Gaming — Anthony Ruiz/);
    await expect(page.getByRole('heading', { level: 1, name: 'Gaming' })).toBeVisible();

    await page.getByRole('link', { name: post.title }).first().click();
    await expect(page).toHaveURL(new RegExp(`/posts/${post.slug}$`));
    await expect(page.getByRole('heading', { level: 1, name: post.title })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/gaming$/);
    await page.goForward();
    await expect(page).toHaveURL(new RegExp(`/posts/${post.slug}$`));
  });

  test('deep link to a post, back button goes home', async ({ page, api }) => {
    const post = await api.createPost({ title: `E2E deep ${stamp()}`, section: 'tech' });
    await page.goto(`/posts/${post.slug}`);
    await expect(page).toHaveTitle(`${post.title} — Anthony Ruiz`);
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('tag page filters across sections', async ({ page }) => {
    await page.goto('/tags/docker-homelab');
    await expect(page.getByText('Filtrado por: #docker-homelab')).toBeVisible();
    await expect(page).toHaveURL(/\/tags\/docker-homelab$/);
  });

  test('unknown section and unknown post render the 404 page', async ({ page }) => {
    await page.goto('/not-a-section');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    await page.goto('/posts/does-not-exist-e2e');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
  });

  test('old hash links redirect to the admin routes', async ({ page }) => {
    await page.goto('/#/status');
    await expect(page).toHaveURL(/\/admin\/status$/);
  });
});

test('bookmarks: save from the post page, list them, remove from the card', async ({ page, api }) => {
  const post = await api.createPost({ title: `E2E bookmark ${stamp()}`, section: 'tech' });
  await page.goto(`/posts/${post.slug}`);
  await page.getByTitle('Guardar en marcadores').click();

  await page.goto('/bookmarks');
  const card = page.locator('main article', { hasText: post.title });
  await expect(card).toBeVisible();
  await card.getByTitle('Guardado').click();
  await expect(card).toHaveCount(0);
});

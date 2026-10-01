import { test, expect, signIn, stamp } from './support/fixtures';

// Admin flows: review queue (Phase A/C), featured posts (Phase E) and the editor
test.describe('admin', () => {
  test.beforeEach(async ({ page, api }) => {
    await signIn(page, api.adminToken);
  });

  test('a creator submission shows up in the badge and can be approved', async ({ page, api }) => {
    await page.goto('/');
    await expect(page.locator('main article').first()).toBeVisible();

    const pending = await api.createPost({ title: `E2E review ${stamp()}`, section: 'career' }, await api.creatorToken());
    expect(pending.status).toBe('pending_review');

    // The count refreshes when the tab regains focus
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page).toHaveTitle(/^\(\d+\) /);

    // The account menu shows the pending count and opens the admin panel
    await page.getByRole('button', { name: /Menú de la cuenta \(\d+/ }).click();
    await page.getByRole('menuitem', { name: /Panel de administración/ }).click();
    await expect(page).toHaveURL(/\/admin\/backups$/);
    const row = page.locator('div.p-4', { hasText: pending.title });
    await row.getByRole('button', { name: 'Approve' }).click();
    await expect(page.getByText(`Published "${pending.title}".`)).toBeVisible();

    const published = await api.call('GET', `/posts/${pending.slug}`);
    expect(published.status).toBe('published');
  });

  test('featuring a post adds it to the section band', async ({ page, api }) => {
    const post = await api.createPost({ title: `E2E featured ${stamp()}`, section: 'gaming' });
    await page.goto('/gaming');
    const card = page.locator('main article', { hasText: post.title }).first();
    await card.getByTitle('Destacar en la sección').click();

    const band = page.locator('section[aria-label="Destacados"]');
    await expect(band.getByText(post.title)).toBeVisible();
    // The counter includes the featured band (the grid itself leaves featured posts out)
    const total = (await api.section('gaming')).post_count;
    await expect(page.getByText(`Mostrando ${total} de ${total} artículos`)).toBeVisible();
    await band.locator('article', { hasText: post.title }).getByTitle('Quitar de destacados').click();
    await expect(band).toHaveCount(0);
  });

  test('the editor saves a draft that appears in My posts', async ({ page, api }) => {
    const title = `E2E draft ${stamp()}`;
    await page.goto('/');
    await page.getByRole('button', { name: /Nuevo Post/ }).first().click();
    await page.locator('form input[type="text"]').first().fill(title);
    await page.locator('form textarea').first().fill('Draft summary');
    await page.locator('form').getByRole('button', { name: /Tech/ }).click();
    await page.locator('form textarea').last().fill('Draft body');
    await page.getByRole('button', { name: 'Guardar borrador' }).click();

    await page.getByRole('button', { name: 'Menú de la cuenta' }).click();
    await page.getByRole('menuitem', { name: 'Mis posts' }).click();
    // Filter by status: the new draft is on the first page of "Borrador"
    await page.getByRole('tab', { name: /Borrador/ }).click();
    const item = page.locator('li', { hasText: title });
    await expect(item.getByText('Borrador')).toBeVisible();

    // Clean up the draft created through the UI
    const mine = await api.call('GET', '/posts/mine', undefined, api.adminToken);
    const draft = mine.find((p: { title: string }) => p.title === title);
    await api.call('DELETE', `/posts/${draft.id}`, undefined, api.adminToken);
  });
});

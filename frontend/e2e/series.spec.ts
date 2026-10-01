import { test, expect, signIn, stamp } from './support/fixtures';

// Series / learning paths (Phase F)
test('series: part N of M, progress and reordering', async ({ page, api }) => {
  const series = await api.createSeries(`E2E path ${stamp()}`, 'tech');
  const one = await api.createPost({ title: `E2E part one ${stamp()}`, section: 'tech', series_id: series.id });
  const two = await api.createPost({ title: `E2E part two ${stamp()}`, section: 'tech', series_id: series.id });
  await signIn(page, api.adminToken);

  await page.goto(`/posts/${two.slug}`);
  await expect(page.getByText('Parte 2 de 2')).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(one.title) })).toBeVisible();

  await page.getByRole('link', { name: series.title }).first().click();
  await expect(page).toHaveURL(new RegExp(`/series/${series.slug}$`));
  await expect(page.getByText('1 de 2 leídos')).toBeVisible();

  const titles = page.locator('ol li a span.leading-snug');
  await expect(titles).toHaveText([one.title, two.title]);
  await page.locator('ol li').nth(1).getByTitle('Subir').click();
  await expect(titles).toHaveText([two.title, one.title]);
});

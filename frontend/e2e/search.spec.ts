import { test, expect, stamp } from './support/fixtures';

// Full-text search page (Phase D)
test('typing in the navbar opens scoped search results with highlights', async ({ page, api }) => {
  const word = `zebra${stamp()}`;
  await api.createPost({ title: `E2E ${word} search`, section: 'ai' });

  await page.goto('/ai');
  await expect(page.getByRole('heading', { level: 1, name: 'AI' })).toBeVisible();
  await page.locator('header input[type="text"]').first().fill(word);
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${word}&section=ai`));
  await expect(page.locator('main li')).toHaveCount(1);
  await expect(page.locator('main mark').first()).toHaveText(new RegExp(word, 'i'));

  // Other section: no results; all sections: back to one result
  await page.locator('main select').selectOption('gaming');
  await expect(page.getByRole('heading', { name: 'Sin resultados' })).toBeVisible();
  await page.locator('main select').selectOption('');
  await expect(page.locator('main li')).toHaveCount(1);

  // Leaving the search page clears the box
  await page.goBack();
  await expect(page).toHaveURL(/\/ai$/);
  await expect(page.locator('header input[type="text"]').first()).toHaveValue('');
});

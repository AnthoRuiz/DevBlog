import { test, expect, signIn, stamp } from './support/fixtures';

// Daily writing ideas: the AI suggests, the admin writes from a guided template
test('an idea is announced and "Start writing" opens a template to write over', async ({ page, api }) => {
  const title = `E2E idea ${stamp()}`;
  const idea = await api.ingestIdea({ title, section_slug: 'tech' });
  await signIn(page, api.adminToken);

  await page.goto('/');
  await expect(page.getByText(/idea\(s\) nueva\(s\) para escribir/)).toBeVisible();
  await page.getByRole('button', { name: 'Ver ideas' }).click();
  await expect(page).toHaveURL(/\/admin\/backups\?tab=ideas$/);

  const card = page.locator('li', { hasText: title });
  await expect(card.getByText('Homelab experiment:')).toBeVisible();
  await card.getByRole('button', { name: 'Start writing' }).click();

  // The editor opens on the admin's own draft with the guided template
  const body = page.locator('form textarea').last();
  await expect(body).toHaveValue(/✍️ \*\*How to use this template:\*\*/);
  await expect(body).toHaveValue(/## Setting it up/);
  await expect(body).toHaveValue(/✍️ What broke first\?/);
  await expect(page.locator('form input[type="text"]').first()).toHaveValue(title);

  const mine = await api.call('GET', '/posts/mine', undefined, api.adminToken);
  const draft = mine.find((p: { title: string }) => p.title === title);
  api.trackPost(draft.id);
  expect(draft.status).toBe('draft');
  expect(draft.origin).toBe('human');

  // Publishing with prompts left asks for confirmation first
  await page.getByRole('button', { name: /Publicar|Guardar cambios/ }).last().click();
  await expect(page.getByText(/Aún quedan \d+ indicaciones ✍️/)).toBeVisible();

  const ideas = await api.call('GET', '/admin/ideas?status=started', undefined, api.adminToken);
  expect(ideas.some((i: { id: string; post_id: string }) => i.id === idea.id && i.post_id === draft.id)).toBe(true);
});

test('the editor offers a template for a blank post', async ({ page, api }) => {
  await signIn(page, api.adminToken);
  await page.goto('/');
  await page.getByRole('button', { name: /Nuevo Post/ }).first().click();
  await page.getByRole('button', { name: /Usar plantilla/ }).click();
  await expect(page.locator('form textarea').last()).toHaveValue(/## Lo que hice|## What I did/);
});

test('the ingest endpoint rejects a wrong key and an unknown section', async ({ request, api }) => {
  const wrongKey = await request.fetch('/api/v1/ideas/ingest', {
    method: 'POST',
    headers: { 'X-API-Key': 'wrong' },
    data: {},
  });
  expect(wrongKey.status()).toBe(401);
  await expect(api.ingestIdea({ title: `E2E idea unknown ${stamp()}`, section_slug: 'mental-health' })).rejects.toThrow(/400/);
});

test('feedback buttons record the reaction and hide ideas he does not want', async ({ page, api }) => {
  const liked = `E2E idea liked ${stamp()}`;
  const unknown = `E2E idea unknown topic ${stamp()}`;
  await api.ingestIdea({ title: liked, section_slug: 'gaming' });
  const hidden = await api.ingestIdea({ title: unknown, section_slug: 'career' });
  await signIn(page, api.adminToken);
  await page.goto('/admin/backups?tab=ideas');

  const likedCard = page.locator('li', { hasText: liked });
  await likedCard.getByRole('button', { name: 'I like it' }).click();
  await expect(likedCard.getByRole('button', { name: 'I like it' })).toHaveAttribute('aria-pressed', 'true');

  await page.locator('li', { hasText: unknown }).getByRole('button', { name: "I don't know this" }).click();
  await expect(page.locator('li', { hasText: unknown })).toHaveCount(0);

  const dismissed = await api.call('GET', '/admin/ideas?status=dismissed', undefined, api.adminToken);
  expect(dismissed.find((i: { id: string }) => i.id === hidden.id)?.feedback).toBe('unknown');
});

test('the writer profile is editable from the ideas tab', async ({ page, api }) => {
  const before = (await api.call('GET', '/admin/ideas/status', undefined, api.adminToken)).profile;
  const item = `E2E topic ${stamp()}`;
  await signIn(page, api.adminToken);
  await page.goto('/admin/backups?tab=ideas');
  try {
    const profile = page.getByTestId('writer-profile');
    await profile.locator('summary').click();
    const learning = profile.locator('textarea[name="learning"]');
    await expect(learning).toHaveValue(/AWS/);
    await learning.fill(`${await learning.inputValue()}\n${item}`);
    await profile.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Profile saved.')).toBeVisible();

    const after = (await api.call('GET', '/admin/ideas/status', undefined, api.adminToken)).profile;
    expect(after.learning).toContain(item);
    expect(after.knows).toEqual(before.knows);
  } finally {
    await api.call('PUT', '/admin/ideas/settings', { profile: before }, api.adminToken);
  }
});

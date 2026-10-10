import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import en from '../../messages/en.json';
test('each community feature has its own focused page and returns to the hub', async ({ page }) => {
  const pages = [
    ['join', en.comm_join, en.eng_nickname],
    ['check-in', en.comm_checkin, null],
    ['mentors', en.comm_mentors, en.comm_question],
    ['become-mentor', en.comm_become_mentor, en.comm_bio],
  ] as const;
  await page.goto('/circles');
  await expect(page.getByLabel(en.eng_nickname)).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  for (const [slug, title, field] of pages) {
    await page.getByRole('link', { name: title, exact: true }).click();
    await expect(page).toHaveURL(`/circles/${slug}`);
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    if (field) await expect(page.getByLabel(field)).toBeVisible();
    if (slug !== 'join') await expect(page.getByLabel(en.eng_nickname)).toHaveCount(0);
    if (slug !== 'mentors') await expect(page.getByLabel(en.comm_question)).toHaveCount(0);
    if (slug !== 'become-mentor') await expect(page.getByLabel(en.comm_bio)).toHaveCount(0);
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.evaluate(() => document.documentElement.clientWidth),
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.reload();
    await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
    await page.getByRole('link', { name: en.comm_title, exact: true }).click();
    await expect(page).toHaveURL('/circles');
  }
});

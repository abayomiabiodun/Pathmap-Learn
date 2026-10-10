import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import en from '../../messages/en.json';
import pcm from '../../messages/pcm.json';
import yo from '../../messages/yo.json';
import ha from '../../messages/ha.json';
import ig from '../../messages/ig.json';
import fr from '../../messages/fr.json';
test('showcase drafts, translations, accessibility and private page caching', async ({ page }) => {
  await page.goto('/circles');
  await page.getByRole('link', { name: en.show_title }).click();
  await expect(page).toHaveURL('/showcase');
  await page.getByLabel(en.show_heading).fill('My first page');
  await page.getByLabel(en.show_body).fill('I learned to create headings and links.');
  await page
    .getByLabel(en.show_photo, { exact: true })
    .setInputFiles('tests/fixtures/showcase.jpg');
  await expect(page.getByRole('img', { name: en.show_preview })).toBeVisible();
  await page.getByLabel(en.show_alt).fill('My first layout sketch');
  await expect(page.getByRole('img', { name: 'My first layout sketch' })).toBeVisible();
  await expect(page.getByRole('button', { name: en.show_publish })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('img', { name: 'My first layout sketch' })).toHaveCount(0);
  await expect(page.getByLabel(en.show_heading)).toHaveValue('My first page');
  for (const [locale, messages] of Object.entries({ pcm, yo, ha, ig, fr, en })) {
    await page.locator('#locale').selectOption(locale);
    await expect(
      page.getByRole('heading', { name: messages.show_title, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(messages.show_heading)).toBeVisible();
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  expect(await page.evaluate(async () => !!(await caches.match('/showcase')))).toBe(false);
  await page.screenshot({
    path: `test-results/showcase-${test.info().project.name}.png`,
    fullPage: true,
  });
});

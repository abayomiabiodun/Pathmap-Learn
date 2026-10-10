import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import en from '../../messages/en.json';
import pcm from '../../messages/pcm.json';
import yo from '../../messages/yo.json';
import ha from '../../messages/ha.json';
import ig from '../../messages/ig.json';
import fr from '../../messages/fr.json';
test('community opens from home, preserves question drafts and gates disconnected actions', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: en.comm_title + ' →', exact: true }).click();
  await expect(page).toHaveURL('/circles');
  await expect(page.getByRole('heading', { name: en.comm_title, exact: true })).toBeVisible();
  await expect(page.getByText(en.comm_unconfigured)).toBeVisible();
  await expect(page.getByRole('button', { name: en.comm_join })).toBeDisabled();
  await page.getByRole('link', { name: en.comm_ask_mentor, exact: true }).click();
  await page
    .getByLabel(en.comm_question)
    .fill('How can I make my page accessible to keyboard users?');
  await expect(page.getByRole('button', { name: en.comm_request })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel(en.comm_question)).toHaveValue(
    'How can I make my page accessible to keyboard users?',
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  expect(await page.evaluate(async () => !!(await caches.match('/circles')))).toBe(false);
  await page.screenshot({
    path: `test-results/community-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('circle and mentor controls translate fully and remain accessible in dark mode', async ({
  page,
}) => {
  await page.goto('/circles');
  for (const [locale, messages] of Object.entries({ pcm, yo, ha, ig, fr, en })) {
    await page.locator('#locale').selectOption(locale);
    await expect(
      page.getByRole('heading', { name: messages.comm_title, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(messages.comm_question)).toBeVisible();
    await expect(page.getByText(messages.comm_unconfigured)).toBeVisible();
    await expect(page.getByRole('button', { name: messages.comm_apply })).toBeDisabled();
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
  const viewport = page.viewportSize();
  // The existing theme control is displayed in the desktop header.
  if (viewport && viewport.width < 650) await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button', { name: en.ui_use_dark_mode }).click();
  if (viewport) await page.setViewportSize(viewport);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('link', { name: en.eng_continue, exact: true }).click();
  await expect(page).toHaveURL('/learn');
});

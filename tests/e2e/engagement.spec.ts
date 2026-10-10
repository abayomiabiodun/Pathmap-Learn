import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import en from '../../messages/en.json';
import pcm from '../../messages/pcm.json';
import yo from '../../messages/yo.json';
import ha from '../../messages/ha.json';
import ig from '../../messages/ig.json';
import fr from '../../messages/fr.json';

test('learning completion builds a local streak, retains weekly goals, and dashboard works offline', async ({
  page,
  context,
}) => {
  await page.goto('/learn/web');
  await page
    .getByRole('textbox')
    .fill('My heading describes my page and my link has meaningful text.');
  await page.getByRole('radio', { name: 'True', exact: true }).check();
  await page.getByRole('button', { name: en.learn_complete }).click();
  await expect(page.getByText(en.learn_success)).toBeVisible();
  await page.getByRole('link', { name: en.eng_dashboard, exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('.eng-metrics').first().locator('strong')).toHaveText([
    '1',
    '1',
    '1',
    '125',
  ]);
  await page.getByLabel(en.eng_goal).selectOption('5');
  await page.getByLabel(en.eng_nickname).fill('Ada Learner');
  await page.getByRole('button', { name: en.eng_save }).click();
  await expect(page.getByText(en.eng_local_saved)).toBeVisible();
  await expect(page.getByLabel(en.eng_public_consent)).not.toBeChecked();
  await expect(page.getByLabel(en.eng_recruiter_consent)).not.toBeChecked();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.reload();
  await expect(page.getByLabel(en.eng_goal)).toHaveValue('5');
  await page.waitForFunction(
    async () =>
      navigator.serviceWorker.controller?.state === 'activated' &&
      (await caches.match('/dashboard'))?.headers.get('content-type')?.includes('text/html'),
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: en.eng_dashboard, exact: true })).toBeVisible();
  await expect(page.locator('.eng-metrics').first().locator('strong')).toHaveText([
    '1',
    '1',
    '1',
    '125',
  ]);
  await context.setOffline(false);
});
test('new dashboards translate all controls in six languages and recruiter access stays gated', async ({
  page,
}) => {
  await page.goto('/dashboard');
  for (const [locale, messages] of Object.entries({ pcm, yo, ha, ig, fr, en })) {
    await page.locator('#locale').selectOption(locale);
    await expect(
      page.getByRole('heading', { name: messages.eng_dashboard, exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel(messages.eng_nickname)).toBeVisible();
    await expect(page.getByRole('button', { name: messages.eng_save })).toBeVisible();
    await expect(page.getByText(messages.eng_unconfigured)).toBeVisible();
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  }
  await page.getByRole('link', { name: en.eng_recruiter, exact: true }).click();
  await expect(page.getByRole('heading', { name: en.eng_recruiter, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: en.eng_search })).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  expect(await page.evaluate(async () => !!(await caches.match('/recruiter')))).toBe(false);
  await page.goto('/');
  await expect(
    page.getByRole('link', { name: en.eng_dashboard + ' →', exact: true }),
  ).toBeVisible();
});

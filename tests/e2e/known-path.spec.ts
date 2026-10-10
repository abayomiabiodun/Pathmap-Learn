import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('known-path link opens the short flow and retains preferences offline', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'I already know my path' }).click();
  await expect(page).toHaveURL('/quiz?skip=true');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Which path would you like to take?',
  );
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('radio', { name: 'Web Development', exact: true }).check();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where are you starting from?');
  await page.getByRole('radio', { name: 'I know some basics', exact: true }).check();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio', { name: 'Français', exact: true }).check();
  await page.getByRole('button', { name: 'Save my learning preferences' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your path is set.');
  await expect(page.getByRole('heading', { name: 'Web Development' })).toBeVisible();
  await expect(page.getByText('Your match breakdown')).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your path is set.');
  await page.getByRole('button', { name: 'Change my choices' }).click();
  await expect(page.getByRole('radio', { name: 'Web Development', exact: true })).toBeChecked();
  await context.setOffline(false);
});

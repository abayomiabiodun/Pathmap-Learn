import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('home, themes, language and local persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Small steps.');
  await page.getByRole('button', { name: 'Lite mode' }).click();
  await expect(page.getByRole('button', { name: 'Lite mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Lite mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByLabel('Language').selectOption('fr');
  await expect(page.getByRole('link', { name: 'Trouver ma voie' })).toBeVisible();
});
for (const route of ['/', '/auth', '/privacy', '/paths', '/offline'])
  test(`accessible ${route}`, async ({ page }) => {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations).toEqual([]);
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      await page.evaluate(() => document.documentElement.clientWidth),
    );
  });
test('email validation and sign up switch', async ({ page }) => {
  await page.goto('/auth');
  await page.getByRole('button', { name: 'New here? Create an account' }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  await page.getByLabel('Email address').fill('learner@example.com');
  await page.getByLabel('Password').fill('secure-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Live accounts are not configured');
});

test('dark mode stays accessible and keyboard focus is visible', async ({ page }, testInfo) => {
  await page.goto('/');
  if (testInfo.project.name === 'desktop') {
    await page.getByRole('button', { name: 'Use dark mode' }).click();
    expect((await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()).violations).toEqual([]);
  }
  await page.keyboard.press('Tab');
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
});

test('public shell works without a connection and account pages are never cached', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.goto('/auth');
  const cachedAuth = await page.evaluate(async () => !!(await caches.match('/auth')));
  expect(cachedAuth).toBe(false);
  await page.goto('/');
  await page.getByRole('button', { name: 'Lite mode' }).click();
  await page.getByRole('button', { name: 'Lite mode' }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Small steps.');
  await expect(page.getByRole('status')).toContainText('offline');
  await context.setOffline(false);
});

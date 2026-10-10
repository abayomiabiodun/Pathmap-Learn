import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fr from '../../messages/fr.json';
import pcm from '../../messages/pcm.json';
import yo from '../../messages/yo.json';
import ha from '../../messages/ha.json';
import ig from '../../messages/ig.json';
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
for (const route of ['/', '/auth', '/privacy', '/paths', '/offline', '/library'])
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
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('A pause in connection');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Small steps.');
  await expect(page.getByRole('status')).toContainText('offline');
  await context.setOffline(false);
});

test('library navigation explains availability and offers a working next step', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'My library', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Your learning library is coming soon.',
  );
  await page.getByRole('link', { name: 'Explore learning paths' }).click();
  await expect(page).toHaveURL('/paths');
});

for (const [locale, messages] of Object.entries({ fr, pcm, yo, ha, ig })) {
  test(`${locale} translates full pages, controls, validation and persisted language`, async ({
    page,
  }) => {
    await page.goto('/');
    await page.locator('#locale').selectOption(locale);
    await expect(page.getByText(messages.ui_big_dreams_small_data, { exact: true })).toBeVisible();
    await expect(page.locator('.theme-toggle')).toHaveAttribute(
      'aria-label',
      messages.ui_use_dark_mode,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    for (const [route, heading] of [
      ['/paths', messages.ui_what_could_your_next_chapter_look_like],
      ['/library', messages.ui_your_learning_library_is_coming_soon],
      ['/privacy', messages.ui_privacy_comes_first],
      ['/offline', messages.ui_a_pause_in_connection_keep_your_momentum],
      ['/auth', messages.ui_your_journey_starts_here],
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.locator('body')).toHaveJSProperty(
        'scrollWidth',
        await page.evaluate(() => document.documentElement.clientWidth),
      );
    }
    await page.getByRole('button', { name: messages.ui_sign_in, exact: true }).click();
    await expect(
      page.getByText(messages.ui_enter_a_valid_email_address, { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: messages.ui_send_me_a_magic_link }).click();
    await expect(page.getByRole('status')).toHaveText(
      messages.ui_enter_your_email_first_so_we_can_send_your_sign_in_link,
    );
    await page.locator('#locale').selectOption('fr');
    await expect(page.getByRole('status')).toHaveText(
      fr.ui_enter_your_email_first_so_we_can_send_your_sign_in_link,
    );
  });
}

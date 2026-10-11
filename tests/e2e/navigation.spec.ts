import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fr from '../../messages/fr.json';

test('hamburger exposes features, supports keyboard dismissal and closes after navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Navigation menu', exact: true });
  const menu = page.getByRole('navigation', { name: 'Navigation menu', exact: true });
  await expect(menu).toBeHidden();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();
  const expected = [
    '/',
    '/quiz',
    '/quiz?skip=true',
    '/taster',
    '/learn',
    '/library',
    '/paths',
    '/dashboard',
    '/circles',
    '/circles/join',
    '/circles/check-in',
    '/circles/mentors',
    '/circles/become-mentor',
    '/showcase',
    '/recruiter',
    '/auth',
    '/privacy',
  ];
  expect(
    await menu
      .getByRole('link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(expected);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.screenshot({ path: `test-results/navigation-${testInfo.project.name}.png` });
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(menu).toBeHidden();
  await toggle.click();
  await page.locator('header').click({ position: { x: 2, y: 2 } });
  await expect(menu).toBeHidden();
  await toggle.click();
  await menu.getByRole('link', { name: 'Find a mentor', exact: true }).click();
  await expect(page).toHaveURL('/circles/mentors');
  await expect(menu).toBeHidden();
  await page.locator('#locale').selectOption('fr');
  await page.getByRole('button', { name: fr.nav_menu, exact: true }).click();
  await expect(
    page
      .getByRole('navigation', { name: fr.nav_menu })
      .getByRole('link', { name: fr.comm_mentors, exact: true }),
  ).toHaveAttribute('aria-current', 'page');
});

test('navigation fits small phones and tablets and its close control stays available when scrolling', async ({
  page,
}) => {
  for (const width of [320, 900]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/');
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width);
    await page.getByRole('button', { name: 'Navigation menu', exact: true }).click();
    const menu = page.getByRole('navigation', { name: 'Navigation menu', exact: true });
    await menu.getByRole('link', { name: 'Privacy', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeInViewport();
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(menu).toBeHidden();
  }
});

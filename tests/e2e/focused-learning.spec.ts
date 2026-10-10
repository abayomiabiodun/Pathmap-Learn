import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('the initial course paint exposes only the saved path, before app hydration', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'pathmap-quiz-v1',
      JSON.stringify({
        version: 1,
        draft: {},
        attempts: [],
        selections: [
          { path: 'web', level: 'new', language: 'en', completedAt: '2026-10-11T09:00:00Z' },
        ],
      }),
    ),
  );
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/learn/web');
  await expect(page.getByRole('heading', { name: 'Web Development', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-learning-path', 'web');
  await page.goto('/learn/data');
  await expect(page.locator('.learning-lesson')).toBeHidden();
});
test('continue learning and library show only the saved path and resume its next lesson', async ({
  page,
}) => {
  await page.goto('/learn');
  await expect(page.getByRole('link', { name: 'Find my path', exact: true })).toBeVisible();
  await page.evaluate(() => {
    localStorage.setItem(
      'pathmap-quiz-v1',
      JSON.stringify({
        version: 1,
        draft: {},
        attempts: [],
        selections: [
          { path: 'web', level: 'new', language: 'en', completedAt: '2026-10-11T09:00:00Z' },
        ],
      }),
    );
    localStorage.setItem(
      'pathmap-learning-v1',
      JSON.stringify({
        version: 1,
        lessons: {
          'web/html': { draft: 'I used headings for my page.', completed: true },
          'data/data': { draft: 'Previous data work.', completed: true },
        },
      }),
    );
  });
  await page.reload();
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Web Development', exact: true })).toBeVisible();
  await expect(page.getByText('1 of 3 lessons completed')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('link', { name: 'Continue learning', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Style a page with CSS' })).toBeVisible();
  await page.goto('/learn/data');
  await expect(page.locator('.learning-lesson')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Continue learning', exact: true })).toHaveAttribute(
    'href',
    '/learn/web',
  );
  await page.goto('/library');
  await expect(page.locator('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Web Development', exact: true })).toBeVisible();
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fr from '../../messages/fr.json';
import lessons from '../../public/lessons/en.json';

test('course assistant answers from lessons, handles follow-ups and navigation, and switches language', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Learning assistant', exact: true }).click();
  await expect(page).toHaveURL('/assistant');
  const input = page.getByRole('textbox', { name: 'Your question' });
  const send = page.getByRole('button', { name: 'Ask assistant', exact: true });
  await input.fill('What is HTML?');
  await send.click();
  const log = page.getByRole('log');
  await expect(log).toContainText('HTML describes the structure of a page');
  await expect(log.getByRole('link').first()).toHaveAttribute('href', '/learn/web?lesson=html');
  await input.fill('Give an example');
  await send.click();
  await expect(log.locator('article')).toHaveCount(2);
  await expect(log.locator('article').last().locator('pre')).toContainText('<h1>Ada</h1>');
  await input.fill('How do I find a mentor?');
  await send.click();
  await expect(log.locator('article').last()).toContainText(
    'Availability and replies depend on mentors',
  );
  await input.fill('xzqv 999999999 lottery');
  await send.click();
  await expect(log.locator('article').last()).toContainText('I could not find a reliable answer');
  await page.getByRole('button', { name: 'Clear conversation' }).click();
  await expect(log.locator('article')).toHaveCount(0);
  await page.locator('.assistant-controls select').first().selectOption('fr');
  await page.getByRole('button', { name: fr.assistant_prompt_concept, exact: true }).click();
  await expect(log).toContainText('HTML');
  await expect(log.locator('article')).toHaveAttribute('lang', 'fr');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.screenshot({ path: `test-results/assistant-${info.project.name}.png` });
});

test('failed materials offer a retry and questions do not go to an external service', async ({
  page,
}) => {
  await page.route('**/lessons/en.json', (route) => route.fulfill({ status: 503, body: '' }));
  await page.goto('/assistant');
  await expect(page.getByRole('status')).toContainText('could not load');
  await expect(page.getByRole('button', { name: 'Ask assistant', exact: true })).toBeDisabled();
  await page.unroute('**/lessons/en.json');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  const outgoing: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') outgoing.push(request.url());
  });
  await page.getByRole('button', { name: 'Explain HTML', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('HTML describes');
  expect(outgoing).toEqual([]);
});

test('source links open the requested lesson without changing the matched course', async ({
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
          { path: 'web', level: 'new', language: 'en', completedAt: '2026-10-12T09:00:00Z' },
        ],
      }),
    ),
  );
  await page.goto('/assistant');
  await page.getByRole('textbox', { name: 'Your question' }).fill('Explain CSS');
  await page.getByRole('button', { name: 'Ask assistant', exact: true }).click();
  await page.getByRole('log').getByRole('link').first().click();
  await expect(page).toHaveURL('/learn/web?lesson=css');
  await expect(page.getByRole('heading', { name: lessons.css.title })).toBeVisible();
});

test('cached course guidance remains available offline', async ({ page, context }) => {
  await page.goto('/assistant');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.reload();
  await page.getByRole('button', { name: 'Explain HTML', exact: true }).click();
  await page.waitForFunction(
    async () => !!(await caches.match('/lessons/en.json')) && !!(await caches.match('/assistant')),
  );
  await page.evaluate(() =>
    localStorage.setItem(
      'pathmap-quiz-v1',
      JSON.stringify({
        version: 1,
        draft: {},
        attempts: [],
        selections: [
          { path: 'web', level: 'new', language: 'en', completedAt: '2026-10-12T09:00:00Z' },
        ],
      }),
    ),
  );
  await page.goto('/learn/web');
  await expect(page.getByRole('heading', { name: lessons.html.title })).toBeVisible();
  await page.goto('/assistant');
  await page.getByRole('button', { name: lessons.html.title, exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: lessons.html.title, exact: true }).click();
  await expect(page.getByRole('log')).toContainText('HTML describes');
  await page.getByRole('textbox', { name: 'Your question' }).fill('Explain CSS');
  await page.getByRole('button', { name: 'Ask assistant', exact: true }).click();
  await page
    .getByRole('log')
    .getByRole('link')
    .filter({ hasText: lessons.css.title })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: lessons.css.title })).toBeVisible();
  await context.setOffline(false);
});

test('starter help follows the matched course', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'pathmap-quiz-v1',
      JSON.stringify({
        version: 1,
        draft: {},
        attempts: [],
        selections: [
          { path: 'data', level: 'new', language: 'en', completedAt: '2026-10-12T09:00:00Z' },
        ],
      }),
    ),
  );
  await page.goto('/assistant');
  await expect(page.locator('.assistant-controls select').last()).toHaveValue('data');
  await page.getByRole('button', { name: lessons.data.title, exact: true }).click();
  await expect(page.getByRole('log')).toContainText(lessons.data.body.split('\n')[0]);
  await expect(page.getByRole('log').getByRole('link').first()).toHaveAttribute(
    'href',
    '/learn/data?lesson=data',
  );
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import yo from '../../messages/yo.json';
import yoruba from '../../public/lessons/yo.json';
import lessons from '../../public/lessons/en.json';
import { lessonIds } from '../../src/lib/learning';

test('known path continues into Yoruba lessons with retained work and offline progress', async ({
  page,
  context,
}) => {
  await page.goto('/quiz?skip=true');
  await page.getByRole('radio', { name: 'Web Development', exact: true }).check();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio', { name: 'I have never started', exact: true }).check();
  await page.getByRole('button', { name: 'Next question' }).click();
  await page.getByRole('radio', { name: 'Yorùbá', exact: true }).check();
  await page.getByRole('button', { name: 'Save my learning preferences' }).click();
  await page.getByRole('link', { name: 'Start learning', exact: true }).click();
  await expect(page).toHaveURL('/learn/web');
  await expect(page.getByRole('heading', { name: yoruba.html.title })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'yo');
  await page
    .getByRole('textbox')
    .fill('<h1>Ada</h1><p>Mo fẹ́ kọ́ HTML.</p><a href="https://example.com">Àpẹẹrẹ</a>');
  await page.getByRole('radio', { name: yo.learn_true, exact: true }).check();
  await page.getByRole('button', { name: yo.learn_complete }).click();
  await expect(page.getByText(yo.learn_success)).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.getByRole('button', { name: yo.learn_next }).click();
  await page.getByRole('textbox').fill('h1 { color: green; } p { padding: 16px; }');
  await page.reload();
  await expect(page.getByRole('heading', { name: yoruba.css.title })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveValue('h1 { color: green; } p { padding: 16px; }');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.waitForFunction(
    async () =>
      !!navigator.serviceWorker.controller &&
      !!(await caches.match('/learn/web')) &&
      !!(await caches.match('/lessons/yo.json')),
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: yoruba.css.title })).toBeVisible();
  await page.getByRole('radio', { name: yo.learn_false, exact: true }).check();
  await page.getByRole('button', { name: yo.learn_complete }).click();
  await expect(page.getByText(yo.learn_success)).toBeVisible();
  await context.setOffline(false);
  await page.goto('/library');
  await expect(page.getByText('Ẹ̀kọ́ 2 nínú 10 ti parí')).toBeVisible();
});

test('all ten paths have usable learning content and the web starter course can be completed', async ({
  page,
}) => {
  async function choose(path: string) {
    await page.goto('/learn');
    await page.evaluate(
      (path) =>
        localStorage.setItem(
          'pathmap-quiz-v1',
          JSON.stringify({
            version: 1,
            draft: {},
            attempts: [],
            selections: [
              { path, level: 'new', language: 'en', completedAt: '2026-10-11T09:00:00Z' },
            ],
          }),
        ),
      path,
    );
    await page.goto(`/learn/${path}`);
  }
  for (const path of [
    'data',
    'cyber',
    'ai',
    'design',
    'marketing',
    'business',
    'writing',
    'project',
    'teaching',
  ]) {
    await choose(path);
    await expect(page.locator('.learning-lesson h2')).toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check and complete lesson' })).toBeVisible();
  }
  await choose('web');
  for (const [index, answer] of ['True', 'False', 'True'].entries()) {
    await page
      .getByRole('textbox')
      .fill(`My practice response for lesson ${index + 1}: I have followed the exercise.`);
    await page.getByRole('radio', { name: answer, exact: true }).check();
    await page.getByRole('button', { name: 'Check and complete lesson' }).click();
    await expect(page.getByText('Lesson completed. Your progress is saved.')).toBeVisible();
    if (index < 2) await page.getByRole('button', { name: 'Next lesson' }).click();
  }
  for (const id of lessonIds.web.slice(3)) {
    await page.getByRole('button', { name: 'Next lesson' }).click();
    const lesson = lessons[id as keyof typeof lessons];
    await expect(page.getByRole('heading', { name: lesson.title })).toBeVisible();
    await page
      .getByRole('textbox')
      .fill(`My practice for ${lesson.title}: I tested the example and explained my decision.`);
    await page.getByRole('radio', { name: lesson.answer ? 'True' : 'False', exact: true }).check();
    await page.getByRole('button', { name: 'Check and complete lesson' }).click();
  }
  await expect(page.getByText('10 of 10 lessons completed')).toBeVisible();
  await expect(page.getByText(/You completed this starter course/)).toBeVisible();
  await page.screenshot({
    path: `test-results/learning-${test.info().project.name}.png`,
    fullPage: true,
  });
});

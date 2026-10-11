import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { completeQuiz, emptyQuiz, type PathId } from '../../src/lib/quiz';
import { lessonIds } from '../../src/lib/learning';
import lessons from '../../public/lessons/en.json';
import french from '../../public/lessons/fr.json';
import fr from '../../messages/fr.json';
const quiz = completeQuiz(
  emptyQuiz,
  {
    interest: 'data',
    strength: 'logic',
    level: 'new',
    background: 'student',
    language: 'en',
    device: 'low',
    style: 'games',
    time: 'one',
    goal: 'job',
    confidence: 'unsure',
  },
  '2026-10-11T09:00:00Z',
);
test('quiz-linked taster supports retry, second-best exploration and a focused ten-lesson course', async ({
  page,
}) => {
  await page.goto('/quiz');
  await page.evaluate(
    (value) => localStorage.setItem('pathmap-quiz-v1', JSON.stringify(value)),
    quiz,
  );
  await page.goto('/quiz/results');
  await page.getByRole('link', { name: 'Try a taster lesson', exact: true }).click();
  await expect(page).toHaveURL('/taster');
  async function play(path: PathId) {
    await page.getByRole('button', { name: 'Start my mini adventure' }).click();
    for (const [index, id] of lessonIds[path].slice(0, 3).entries()) {
      const lesson = lessons[id as keyof typeof lessons];
      if (index === 0) {
        await page
          .getByRole('button', { name: lesson.answer ? 'False' : 'True', exact: true })
          .click();
        await expect(page.getByText(/Try again. Look for the evidence/)).toBeVisible();
      }
      await page
        .getByRole('button', { name: lesson.answer ? 'True' : 'False', exact: true })
        .click();
      await expect(page.getByText(/Star earned!/)).toBeVisible();
      await page
        .getByRole('button', {
          name: index === 2 ? 'Make something small' : 'Next challenge',
          exact: true,
        })
        .click();
    }
    await expect(page.getByRole('button', { name: 'Loved it' })).toBeDisabled();
    await page
      .getByRole('textbox')
      .fill('I tried a synthetic example, explained my choice and checked the result.');
  }
  await play('data');
  await page.getByRole('button', { name: 'Not for me' }).click();
  await expect(page.getByText(/next strongest assessment match is AI/)).toBeVisible();
  await page.getByRole('button', { name: 'Try my alternative path' }).click();
  await expect(
    page.getByRole('heading', { name: 'AI and Machine Learning', exact: true }),
  ).toBeVisible();
  await play('ai');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.getByRole('button', { name: 'Loved it' }).click();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('pathmap-taster-v1')!).sessions.length,
    ),
  ).toBe(2);
  await page.goto('/learn');
  await expect(
    page.getByRole('heading', { name: 'AI and Machine Learning', exact: true }),
  ).toBeVisible();
  await expect(page.locator('article')).toHaveCount(1);
  await page.getByRole('link', { name: 'Continue learning', exact: true }).click();
  await expect(page).toHaveURL('/learn/ai');
  await expect(page.locator('.learning-outline button')).toHaveCount(10);
  await expect(page.getByText('0 of 10 lessons completed')).toBeVisible();
  await page.screenshot({
    path: `test-results/ten-lessons-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test('taster follows the selected language and an unassessed learner can reach the quiz', async ({
  page,
}) => {
  await page.goto('/taster');
  await expect(page.getByRole('link', { name: 'Back to the path quiz' })).toHaveAttribute(
    'href',
    '/quiz',
  );
  await expect(page.getByRole('heading', { name: 'Discover a path to try first' })).toBeVisible();
  await page.evaluate(
    (value) => localStorage.setItem('pathmap-quiz-v1', JSON.stringify(value)),
    quiz,
  );
  await page.reload();
  await page.locator('#locale').selectOption('fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.taster_title);
  await page.getByRole('button', { name: fr.taster_begin }).click();
  await expect(page.getByRole('heading', { name: french.data.title })).toBeVisible();
  await page.getByRole('button', { name: fr.learn_true, exact: true }).click();
  await page.getByRole('button', { name: fr.taster_next }).click();
  await expect(page.getByRole('heading', { name: french['data-clean'].title })).toBeVisible();
  await expect(page.getByText(french['data-clean'].statement, { exact: true })).toBeVisible();
});

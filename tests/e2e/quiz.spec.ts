import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fr from '../../messages/fr.json';
import { questionIds } from '../../src/lib/quiz';
const options = [
  'Finding patterns in numbers',
  'Finding patterns and solving problems',
  'I have never started',
  'Student',
  'English',
  'I need to keep data use low',
  'Reading short explanations',
  'About 1 hour a week',
  'Find a job',
  'Curious, but not sure where to start',
];
test('find my path opens a working quiz, resumes answers and reveals recommendations', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Find my path', exact: true }).click();
  await expect(page).toHaveURL('/quiz');
  await expect(page).toHaveTitle(/PathMap Learn/);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.getByRole('button', { name: 'Next question' })).toBeDisabled();
  for (let index = 0; index < options.length; index++) {
    await page.getByRole('radio', { name: options[index], exact: true }).check();
    if (index === 1) {
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(
        page.getByRole('radio', { name: 'Finding patterns in numbers', exact: true }),
      ).toBeChecked();
      await page.getByRole('button', { name: 'Next question' }).click();
      await expect(page.getByRole('radio', { name: options[index], exact: true })).toBeChecked();
    }
    await page
      .getByRole('button', {
        name: index === options.length - 1 ? 'See my strengths and paths' : 'Next question',
      })
      .click();
    if (index === 1) {
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Where are you starting from?',
      );
    }
  }
  await expect(page).toHaveURL('/quiz/results');
  await expect(page.locator('.quiz-result-card.primary h2')).toHaveText('Data');
  await expect(
    page.getByRole('link', { name: 'Try a taster lesson', exact: true }),
  ).toHaveAttribute('href', '/taster');
  await expect(page.locator('.quiz-result-card:not(.primary) h2')).toHaveText(
    'AI and Machine Learning',
  );
  await expect(
    page.getByText('You chose an interest in Finding patterns in numbers.', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/quiz-results-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze())
      .violations,
  ).toEqual([]);
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.getByRole('button', { name: 'Choose this path instead' }).click();
  await expect(page.locator('.quiz-result-card.primary h2')).toHaveText('AI and Machine Learning');
  await page.getByRole('link', { name: 'Try a taster lesson', exact: true }).click();
  await expect(page).toHaveURL('/taster');
  await expect(
    page.getByRole('heading', { name: 'AI and Machine Learning', exact: true }),
  ).toBeVisible();
  await page.goto('/quiz/results');
  await page.getByRole('button', { name: 'Retake the quiz' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Which kind of work interests you most?',
  );
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('pathmap-quiz-v1')!).attempts.length),
  ).toBe(1);
});
test('quiz can finish offline after the public shell is cached', async ({ page, context }) => {
  await page.goto('/quiz');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  for (let index = 0; index < options.length; index++) {
    await page.getByRole('radio', { name: options[index], exact: true }).check();
    await page
      .getByRole('button', {
        name: index === options.length - 1 ? 'See my strengths and paths' : 'Next question',
      })
      .click();
  }
  await expect(page).toHaveURL('/quiz/results');
  await expect(page.locator('.quiz-result-card.primary h2')).toHaveText('Data');
  await context.setOffline(false);
});
test('quiz questions, options and results follow the selected language', async ({ page }) => {
  await page.goto('/quiz');
  await page.locator('#locale').selectOption('fr');
  const labels = [
    fr.quiz_interest_data,
    fr.quiz_strength_logic,
    fr.quiz_level_new,
    fr.quiz_background_student,
    'Français',
    fr.quiz_device_low,
    fr.quiz_style_reading,
    fr.quiz_time_one,
    fr.quiz_goal_job,
    fr.quiz_confidence_unsure,
  ];
  for (let index = 0; index < labels.length; index++) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      fr[`quiz_question_${questionIds[index]}`],
    );
    await page.getByRole('radio', { name: labels[index], exact: true }).check();
    await page
      .getByRole('button', {
        name: index === labels.length - 1 ? fr.quiz_show_results : fr.quiz_next,
      })
      .click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr.quiz_results_heading);
  await expect(page.locator('.quiz-result-card.primary h2')).toHaveText(fr.ui_data);
  await expect(page.getByText(fr.quiz_strength_description_logic, { exact: true })).toBeVisible();
});

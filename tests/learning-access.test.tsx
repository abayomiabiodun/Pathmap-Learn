import { it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { LearningAccess } from '../src/components/learning-access';
import { learningPathFromQuiz, emptyQuiz, completeQuiz, completeKnownPath } from '../src/lib/quiz';
import en from '../messages/en.json';
import lessons from '../public/lessons/en.json';
afterEach(() => vi.restoreAllMocks());
const known = completeKnownPath(
  emptyQuiz,
  { interest: 'web', level: 'new', language: 'en' },
  '2026-10-11T09:00:00Z',
);
function show(path?: 'web' | 'data') {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <LearningAccess path={path} initialLessons={lessons} />
    </NextIntlClientProvider>,
  );
}
it('chooses the newest completed result and does not invent a course from a draft', () => {
  const attempt = completeQuiz(
    emptyQuiz,
    {
      interest: 'data',
      strength: 'logic',
      level: 'new',
      background: 'student',
      language: 'en',
      device: 'low',
      style: 'reading',
      time: 'one',
      goal: 'job',
      confidence: 'unsure',
    },
    '2026-10-10T09:00:00Z',
  );
  expect(learningPathFromQuiz(JSON.stringify(attempt))).toBe(attempt.attempts[0].chosenPath);
  expect(learningPathFromQuiz(JSON.stringify({ ...known, attempts: attempt.attempts }))).toBe(
    'web',
  );
  expect(
    learningPathFromQuiz(
      JSON.stringify({
        ...known,
        attempts: [{ ...attempt.attempts[0], completedAt: '2026-10-12T09:00:00Z' }],
      }),
    ),
  ).toBe(attempt.attempts[0].chosenPath);
  for (const raw of [
    null,
    '{',
    JSON.stringify(emptyQuiz),
    JSON.stringify({ ...emptyQuiz, draft: { interest: 'web' } }),
  ])
    expect(learningPathFromQuiz(raw)).toBeNull();
});
it('shows only the assigned course, including saved progress', () => {
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(known));
  localStorage.setItem(
    'pathmap-learning-v1',
    JSON.stringify({
      version: 1,
      lessons: {
        'web/html': { draft: 'My page uses semantic headings.', completed: true },
        'data/data': { draft: 'Other previous work.', completed: true },
      },
    }),
  );
  show();
  expect(screen.getByRole('heading', { name: 'Web Development' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Data' })).not.toBeInTheDocument();
  expect(screen.getByText('1 of 10 lessons completed')).toBeVisible();
  expect(screen.getByRole('link', { name: en.eng_continue })).toHaveAttribute('href', '/learn/web');
});
it('gates a direct link to another course', () => {
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(known));
  show('data');
  expect(screen.getByText(en.learn_matched_only)).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: en.eng_continue })).toHaveAttribute('href', '/learn/web');
});
it('resumes the next lesson of the assigned course', () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true } as Response);
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(known));
  localStorage.setItem(
    'pathmap-learning-v1',
    JSON.stringify({
      version: 1,
      lessons: { 'web/html': { draft: 'My page uses semantic headings.', completed: true } },
    }),
  );
  show('web');
  expect(screen.getByRole('heading', { name: lessons.css.title })).toBeVisible();
});
it('sends learners without a completed assessment to the quiz', () => {
  show();
  expect(screen.getByText(en.learn_assess_first)).toBeVisible();
  expect(screen.getByRole('link', { name: en.start })).toHaveAttribute('href', '/quiz');
  expect(screen.queryByRole('link', { name: en.eng_continue })).not.toBeInTheDocument();
});
it('handles inaccessible device storage', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('unavailable');
  });
  show();
  expect(screen.getByText(en.learn_assess_first)).toBeVisible();
});

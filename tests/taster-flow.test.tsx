import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Taster } from '@/components/taster';
import { completeKnownPath, completeQuiz, emptyQuiz, learningPathFromQuiz } from '@/lib/quiz';
import en from '../messages/en.json';
import lessons from '../public/lessons/en.json';
import { lessonIds } from '@/lib/learning';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => vi.restoreAllMocks());
const assessed = completeQuiz(
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
function show(value = assessed) {
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(value));
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => lessons,
  } as Response);
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Taster />
    </NextIntlClientProvider>,
  );
}
async function play(path: keyof typeof lessonIds) {
  fireEvent.click(await screen.findByRole('button', { name: en.taster_begin }));
  for (const [index, id] of lessonIds[path].slice(0, 3).entries()) {
    const lesson = lessons[id as keyof typeof lessons];
    if (index === 0) {
      fireEvent.click(
        screen.getByRole('button', {
          name: lesson.answer ? en.learn_false : en.learn_true,
        }),
      );
      expect(screen.getByText(en.taster_wrong)).toBeVisible();
    }
    fireEvent.click(
      screen.getByRole('button', {
        name: lesson.answer ? en.learn_true : en.learn_false,
      }),
    );
    expect(screen.getByText(en.taster_correct)).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: index === 2 ? en.taster_build : en.taster_next }),
    );
  }
  expect(screen.getByRole('button', { name: en.taster_rating_loved })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '10 + 20 + 30 = 60. The average is 20; I would verify the units.' },
  });
}
it('offers the alternative without changing the course until the learner accepts its taster', async () => {
  show();
  await play('data');
  fireEvent.click(screen.getByRole('button', { name: en['taster_rating_not-for-me'] }));
  expect(learningPathFromQuiz(localStorage.getItem('pathmap-quiz-v1'))).toBe('data');
  expect(screen.getByText(/next strongest assessment match is AI/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: en.taster_try_second }));
  await play('ai');
  fireEvent.click(screen.getByRole('button', { name: en.taster_rating_loved }));
  expect(learningPathFromQuiz(localStorage.getItem('pathmap-quiz-v1'))).toBe('ai');
  expect(screen.getByRole('link', { name: en.taster_continue })).toHaveAttribute('href', '/learn');
  const saved = JSON.parse(localStorage.getItem('pathmap-taster-v1')!);
  expect(saved.sessions.map((item: { rating: string }) => item.rating)).toEqual([
    'not-for-me',
    'loved',
  ]);
  expect(saved.sessions[0].attempts).toBe(4);
  expect(localStorage.getItem('pathmap-learning-v1')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: en.taster_replay }));
  expect(await screen.findByRole('button', { name: en.taster_begin })).toBeVisible();
});
it('accepts an okay rating and preserves the original assessed course', async () => {
  show();
  await play('data');
  fireEvent.click(screen.getByRole('button', { name: en.taster_rating_okay }));
  expect(screen.getByText(en.taster_result_okay)).toBeVisible();
  expect(learningPathFromQuiz(localStorage.getItem('pathmap-quiz-v1'))).toBe('data');
});
it('lets a learner reject both tasters and restart the assessment without deleting their chosen course', async () => {
  show();
  await play('data');
  fireEvent.click(screen.getByRole('button', { name: en['taster_rating_not-for-me'] }));
  fireEvent.click(screen.getByRole('button', { name: en.taster_try_second }));
  await play('ai');
  fireEvent.click(screen.getByRole('button', { name: en['taster_rating_not-for-me'] }));
  expect(screen.getByText(en.taster_reassess)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: en.quiz_retake }));
  const quiz = JSON.parse(localStorage.getItem('pathmap-quiz-v1')!);
  expect(quiz.draft).toEqual({});
  expect(quiz.attempts).toHaveLength(1);
  expect(learningPathFromQuiz(JSON.stringify(quiz))).toBe('data');
});
it('does not fabricate a scored alternative for an explicit path choice', async () => {
  show(completeKnownPath(emptyQuiz, { interest: 'data', level: 'new', language: 'en' }, 'now'));
  await play('data');
  fireEvent.click(screen.getByRole('button', { name: en['taster_rating_not-for-me'] }));
  expect(screen.getByText(en.taster_reassess)).toBeVisible();
  expect(screen.queryByRole('button', { name: en.taster_try_second })).toBeNull();
});
it('guides missing assessments to the quiz and allows a failed content request to retry', async () => {
  const view = show(emptyQuiz);
  expect(screen.getByText(en.taster_need_quiz)).toBeVisible();
  view.unmount();
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(assessed));
  const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <Taster />
    </NextIntlClientProvider>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(en.learn_load_error);
  fetch.mockResolvedValue({ ok: true, json: async () => lessons } as Response);
  fireEvent.click(screen.getByRole('button', { name: en.learn_retry }));
  expect(await screen.findByRole('button', { name: en.taster_begin })).toBeVisible();
});
it('keeps the rating form usable and reports a save failure', async () => {
  show();
  await play('data');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota');
  });
  fireEvent.click(screen.getByRole('button', { name: en.taster_rating_loved }));
  expect(screen.getByRole('alert')).toHaveTextContent(en.learn_save_error);
  expect(screen.queryByRole('link', { name: en.taster_continue })).toBeNull();
});

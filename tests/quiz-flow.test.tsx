import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Providers } from '@/components/providers';
import en from '../messages/en.json';
import { KnownPath, Quiz, QuizResults } from '@/components/quiz';
import {
  completeKnownPath,
  completeQuiz,
  emptyQuiz,
  learningPathFromQuiz,
  type QuizAnswers,
} from '@/lib/quiz';
const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const answers: QuizAnswers = {
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
};
function app(component: React.ReactNode) {
  return render(<Providers initialMessages={en}>{component}</Providers>);
}
it('selects a known path in three steps, restores it and allows edits without scored results', () => {
  const view = app(<KnownPath />);
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Web Development' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('radio', { name: 'I know some basics' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Français' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save my learning preferences' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your path is set.');
  expect(screen.queryByText('Your match breakdown')).not.toBeInTheDocument();
  view.unmount();
  app(<KnownPath />);
  expect(screen.getByRole('heading', { name: 'Web Development' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Change my choices' }));
  expect(screen.getByRole('radio', { name: 'Web Development' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which path');
});
it('requires an answer, supports back, restores progress and completes the quiz', () => {
  const view = app(<Quiz />);
  expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Finding patterns in numbers' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which kind of work');
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(screen.getByRole('radio', { name: 'Finding patterns in numbers' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
  view.unmount();
  app(<Quiz />);
  const labels = [
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
  labels.forEach((label, index) => {
    fireEvent.click(screen.getByRole('radio', { name: label }));
    fireEvent.click(
      screen.getByRole('button', {
        name: index === labels.length - 1 ? 'See my strengths and paths' : 'Next question',
      }),
    );
  });
  expect(push).toHaveBeenCalledWith('/quiz/results');
  expect(JSON.parse(localStorage.getItem('pathmap-quiz-v1')!).attempts[0].answers).toEqual(answers);
});
it('shows empty results, recommendations, explanations, path switching and a safe retake', () => {
  const empty = app(<QuizResults />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('discover your strengths');
  empty.unmount();
  localStorage.setItem(
    'pathmap-quiz-v1',
    JSON.stringify(completeQuiz(emptyQuiz, answers, 'today')),
  );
  app(<QuizResults />);
  expect(screen.getByRole('heading', { name: 'The strength you identified' })).toBeVisible();
  expect(screen.getByText('You chose an interest in Finding patterns in numbers.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Choose this path instead' }));
  expect(JSON.parse(localStorage.getItem('pathmap-quiz-v1')!).attempts[0].chosenPath).toBe('ai');
  fireEvent.click(screen.getByRole('button', { name: 'Retake the quiz' }));
  const stored = JSON.parse(localStorage.getItem('pathmap-quiz-v1')!);
  expect(stored.draft).toEqual({});
  expect(stored.attempts).toHaveLength(1);
  expect(push).toHaveBeenCalledWith('/quiz');
});
it('explains a storage failure rather than claiming the answer was saved', () => {
  app(<Quiz />);
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Finding patterns in numbers' }));
  expect(screen.getByRole('alert')).toHaveTextContent('could not save');
  spy.mockRestore();
});

it('reopens completed assessments with review and retake actions instead of the last question', () => {
  localStorage.setItem(
    'pathmap-quiz-v1',
    JSON.stringify(completeQuiz(emptyQuiz, answers, '2026-01-01')),
  );
  app(<Quiz />);
  expect(screen.getByRole('link', { name: 'See my strengths and paths' })).toHaveAttribute(
    'href',
    '/quiz/results',
  );
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retake the quiz' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which kind of work');
  expect(JSON.parse(localStorage.getItem('pathmap-quiz-v1')!).attempts).toHaveLength(1);
});

it('requires explicitly reactivating an older result so its taster matches the displayed path', () => {
  const state = completeKnownPath(
    completeQuiz(emptyQuiz, answers, '2026-01-01'),
    { interest: 'web', level: 'new', language: 'yo' },
    '2026-02-01',
  );
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(state));
  app(<QuizResults />);
  expect(screen.getByRole('status')).toHaveTextContent('Your current path is Web Development');
  expect(screen.queryByRole('link', { name: 'Try a taster lesson' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Use this result and try a taster' }));
  expect(learningPathFromQuiz(localStorage.getItem('pathmap-quiz-v1'))).toBe('data');
  expect(push).toHaveBeenCalledWith('/taster');
});

it('does not present an older manual selection as the current path after a newer assessment', () => {
  const state = completeQuiz(
    completeKnownPath(emptyQuiz, { interest: 'web', level: 'new', language: 'yo' }, '2026-01-01'),
    answers,
    '2026-02-01',
  );
  localStorage.setItem('pathmap-quiz-v1', JSON.stringify(state));
  app(<KnownPath />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Which path would you like');
  expect(screen.queryByRole('link', { name: 'Start learning' })).not.toBeInTheDocument();
  expect(learningPathFromQuiz(localStorage.getItem('pathmap-quiz-v1'))).toBe('data');
});

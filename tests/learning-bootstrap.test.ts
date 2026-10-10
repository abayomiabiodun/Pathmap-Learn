import { it, expect, vi, afterEach } from 'vitest';
import { restoreLearningPath } from '../src/lib/learning-bootstrap';
import {
  answerOptions,
  emptyQuiz,
  completeKnownPath,
  completeQuiz,
  learningPathFromQuiz,
} from '../src/lib/quiz';
afterEach(() => {
  vi.restoreAllMocks();
  delete document.documentElement.dataset.learningPath;
});
const known = completeKnownPath(
  emptyQuiz,
  { interest: 'web', level: 'new', language: 'en' },
  '2026-10-11T09:00:00Z',
);
const attempted = completeQuiz(
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
it('reveals the same path as the full assessment reader before hydration', () => {
  for (const value of [
    known,
    attempted,
    { ...known, attempts: attempted.attempts },
    { ...known, attempts: [{ ...attempted.attempts[0], completedAt: '2026-10-12T09:00:00Z' }] },
    emptyQuiz,
    { version: 1, draft: {}, attempts: [] },
  ]) {
    const raw = JSON.stringify(value);
    localStorage.setItem('pathmap-quiz-v1', raw);
    restoreLearningPath(answerOptions);
    expect(document.documentElement.dataset.learningPath).toBe(learningPathFromQuiz(raw) ?? '');
  }
});
it('keeps every course hidden for malformed or unfinished assessment data', () => {
  const bad = [
    null,
    [],
    { ...known, version: 2 },
    { ...known, draft: null },
    { ...known, draft: { interest: 'unknown' } },
    { ...known, attempts: null },
    { ...known, attempts: Array(26).fill(attempted.attempts[0]) },
    { ...known, knownDraft: null },
    { ...known, knownDraft: { language: 'unknown' } },
    { ...known, selections: null },
    { ...known, selections: Array(26).fill(known.selections[0]) },
    { ...known, selections: [{ ...known.selections[0], level: 'unknown' }] },
    { ...known, selections: [{ ...known.selections[0], language: 'unknown' }] },
    { ...known, selections: [{ ...known.selections[0], path: 'unknown' }] },
    { ...known, selections: [{ ...known.selections[0], completedAt: null }] },
    { ...attempted, attempts: [null] },
    { ...attempted, attempts: [{ ...attempted.attempts[0], answers: {} }] },
    { ...attempted, attempts: [{ ...attempted.attempts[0], chosenPath: 'unknown' }] },
    { ...attempted, attempts: [{ ...attempted.attempts[0], completedAt: null }] },
  ];
  for (const value of bad) {
    const raw = JSON.stringify(value);
    localStorage.setItem('pathmap-quiz-v1', raw);
    restoreLearningPath(answerOptions);
    expect(document.documentElement.dataset.learningPath).toBe('');
    expect(learningPathFromQuiz(raw)).toBeNull();
  }
  localStorage.setItem('pathmap-quiz-v1', '{');
  restoreLearningPath(answerOptions);
  expect(document.documentElement.dataset.learningPath).toBe('');
  localStorage.removeItem('pathmap-quiz-v1');
  restoreLearningPath(answerOptions);
  expect(document.documentElement.dataset.learningPath).toBe('');
});
it('does not expose a previous path when storage access fails', () => {
  document.documentElement.dataset.learningPath = 'web';
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw Error('blocked');
  });
  restoreLearningPath(answerOptions);
  expect(document.documentElement.dataset.learningPath).toBe('');
});

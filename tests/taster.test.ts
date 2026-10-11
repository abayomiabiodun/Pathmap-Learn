import { expect, it } from 'vitest';
import { completeKnownPath, completeQuiz, emptyQuiz, learningPathFromQuiz } from '@/lib/quiz';
import { acceptTaster, emptyTaster, readTaster, tasterChoices } from '@/lib/taster';
const answers = {
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
};
const assessed = completeQuiz(emptyQuiz, answers, '2026-10-11T09:00:00Z');
it('offers the genuine second assessment match and never invents one for a known path', () => {
  expect(tasterChoices(JSON.stringify(assessed))).toEqual({
    path: 'data',
    alternative: 'ai',
    language: 'en',
    level: 'new',
  });
  const known = completeKnownPath(
    assessed,
    { interest: 'web', level: 'basics', language: 'yo' },
    '2026-10-11T10:00:00Z',
  );
  expect(tasterChoices(JSON.stringify(known))).toEqual({
    path: 'web',
    alternative: null,
    language: 'yo',
    level: 'basics',
  });
  expect(
    tasterChoices(
      JSON.stringify({
        ...known,
        attempts: [{ ...assessed.attempts[0], completedAt: '2026-10-11T11:00:00Z' }],
      }),
    )?.path,
  ).toBe('data');
  for (const raw of [null, '{', JSON.stringify(emptyQuiz)]) expect(tasterChoices(raw)).toBeNull();
});
it('accepts only an assessed candidate and preserves preferences, history and ranking', () => {
  const changed = acceptTaster(assessed, 'ai', '2026-10-11T12:00:00Z');
  expect(learningPathFromQuiz(JSON.stringify(changed))).toBe('ai');
  expect(changed.attempts[0].answers).toEqual(assessed.attempts[0].answers);
  expect(tasterChoices(JSON.stringify(changed))?.alternative).toBe('data');
  expect(() => acceptTaster(assessed, 'web', 'now')).toThrow('Unmatched');
  expect(() => acceptTaster(emptyQuiz, 'data', 'now')).toThrow('Unmatched');
  const known = completeKnownPath(
    assessed,
    { interest: 'web', level: 'basics', language: 'yo' },
    '2026-10-11T10:00:00Z',
  );
  expect(() => acceptTaster(known, 'data', 'now')).toThrow();
  const accepted = acceptTaster(known, 'web', '2026-10-11T12:00:00Z');
  expect(accepted.selections.at(-1)).toMatchObject({
    path: 'web',
    level: 'basics',
    language: 'yo',
  });
  const many = { ...known, selections: Array(25).fill(known.selections[0]) };
  expect(acceptTaster(many, 'web', 'later').selections).toHaveLength(25);
});
it('validates rating records and recovers from invalid or missing storage', () => {
  const valid = {
    version: 1,
    sessions: [
      {
        path: 'data',
        rating: 'loved',
        completedAt: 'now',
        practice: 'A synthetic data practice response.',
        attempts: 4,
      },
    ],
  };
  expect(readTaster(JSON.stringify(valid))).toEqual(valid);
  for (const raw of [
    null,
    '{',
    JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, sessions: [{ ...valid.sessions[0], attempts: 0 }] }),
    JSON.stringify({ ...valid, sessions: Array(26).fill(valid.sessions[0]) }),
  ])
    expect(readTaster(raw)).toEqual(emptyTaster);
});

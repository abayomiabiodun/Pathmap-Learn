import { expect, it } from 'vitest';
import {
  defaultVisibility,
  learningStats,
  readVisibility,
  streakStats,
  topLearners,
  visibilitySchema,
  visibilityFromQuiz,
  type LearnerCard,
} from '@/lib/engagement';
import { emptyProgress, learningDay, markLessonComplete } from '@/lib/learning';
import { emptyQuiz } from '@/lib/quiz';

it('uses Lagos dates at midnight and records each lesson once per day without changing old drafts', () => {
  expect(learningDay(new Date('2026-10-09T23:00:00Z'))).toBe('2026-10-10');
  expect(learningDay(new Date('2026-10-09T22:59:59Z'))).toBe('2026-10-09');
  expect(learningDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const original = {
    version: 1 as const,
    lessons: { 'web/html': { draft: 'A heading, paragraph and link', completed: false } },
  };
  const first = markLessonComplete(original, 'web', 'html', new Date('2026-10-10T10:00:00Z'));
  const repeated = markLessonComplete(first, 'web', 'html', new Date('2026-10-10T12:00:00Z'));
  expect(repeated.events).toEqual([{ day: '2026-10-10', lesson: 'web/html' }]);
  expect(original.lessons['web/html'].completed).toBe(false);
  expect(
    markLessonComplete(repeated, 'web', 'html', new Date('2026-10-11T10:00:00Z')).events,
  ).toHaveLength(2);
  expect(() => markLessonComplete(emptyProgress, 'web', 'html')).toThrow('Invalid practice');
  expect(() =>
    markLessonComplete(
      { version: 1, lessons: { 'web/html': { draft: '😀'.repeat(10), completed: false } } },
      'web',
      'html',
    ),
  ).toThrow('Invalid practice');
  expect(() => markLessonComplete(first, 'web', 'unknown')).toThrow('Invalid practice');
});
it('deduplicates learning days, excludes future and impossible dates, and preserves only one missed day', () => {
  expect(streakStats([], '2026-10-10')).toMatchObject({
    current: 0,
    best: 0,
    active30: 0,
    week: 0,
    today: false,
    lastActive: null,
  });
  expect(
    streakStats(
      ['2026-10-10', '2026-10-09', '2026-10-10', '2026-10-11', 'invalid', '2026-02-30'],
      '2026-10-10',
    ),
  ).toMatchObject({ current: 2, best: 2, week: 2, today: true, lastActive: '2026-10-10' });
  expect(streakStats(['2026-10-08', '2026-10-09'], '2026-10-10')).toMatchObject({
    current: 2,
    freezeUsed: false,
  });
  expect(streakStats(['2026-10-07', '2026-10-08'], '2026-10-10')).toMatchObject({
    current: 2,
    freezeUsed: true,
  });
  expect(streakStats(['2026-10-06', '2026-10-07'], '2026-10-10').current).toBe(0);
  expect(
    streakStats(['2026-10-05', '2026-10-07', '2026-10-08', '2026-10-10'], '2026-10-10'),
  ).toMatchObject({ current: 3, best: 3, freezeUsed: true });
  expect(
    streakStats(
      ['2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-07', '2026-10-08'],
      '2026-10-08',
    ),
  ).toMatchObject({ current: 5, best: 5 });
  expect(streakStats(['2026-10-01', '2026-10-04', '2026-10-05'], '2026-10-05')).toMatchObject({
    current: 2,
    best: 2,
  });
  expect(
    streakStats(
      ['2026-10-01', '2026-10-03', '2026-10-05', '2026-10-07', '2026-10-09'],
      '2026-10-10',
    ).current,
  ).toBe(2);
  expect(streakStats([])).toMatchObject({ current: 0 });
});
it('uses rolling seven and thirty day windows and does not award points for unknown lessons or frozen days', () => {
  const stats = learningStats(
    {
      version: 1,
      lessons: {
        'web/html': { draft: 'A useful practice', completed: true },
        fake: { draft: 'fake', completed: true },
        'web/css': { draft: 'draft', completed: false },
      },
      events: [
        { day: '2026-10-10', lesson: 'web/html' },
        { day: '2026-10-10', lesson: 'web/html' },
        { day: '2026-10-04', lesson: 'web/html' },
        { day: '2026-10-03', lesson: 'web/html' },
        { day: '2026-09-11', lesson: 'web/html' },
        { day: '2026-09-10', lesson: 'web/html' },
        { day: '2026-10-11', lesson: 'web/html' },
        { day: '2026-10-09', lesson: 'fake' },
        { day: '2026-02-30', lesson: 'web/html' },
      ],
    },
    '2026-10-10',
  );
  expect(stats).toMatchObject({ completed: 1, xp: 225, week: 2, active30: 4 });
  expect(learningStats(emptyProgress)).toMatchObject({ completed: 0, xp: 0, current: 0 });
});
it('keeps sharing off by default and validates every profile field', () => {
  for (const raw of [null, '{', '{}']) expect(readVisibility(raw)).toEqual(defaultVisibility);
  const valid = { ...defaultVisibility, nickname: 'Adẹ́ 12', leaderboard: true };
  expect(readVisibility(JSON.stringify(valid))).toEqual(valid);
  expect(visibilitySchema.safeParse(valid).success).toBe(true);
  for (const changed of [
    { nickname: 'x' },
    { nickname: '<script>' },
    { nickname: 'a'.repeat(31) },
    { location: 'a'.repeat(81) },
    { level: 'expert' },
    { path: 'fake' },
    { language: 'xx' },
    { opportunity: 'email' },
    { recruiter: 1 },
  ])
    expect(visibilitySchema.safeParse({ ...valid, ...changed }).success).toBe(false);
});
it('starts the dashboard with the most recent discovered or chosen path, without enabling sharing', () => {
  expect(visibilityFromQuiz(null)).toEqual(defaultVisibility);
  const selected = {
    ...emptyQuiz,
    selections: [{ path: 'data', level: 'basics', language: 'yo', completedAt: '2026-10-10' }],
  };
  expect(visibilityFromQuiz(JSON.stringify(selected))).toMatchObject({
    path: 'data',
    level: 'basics',
    language: 'yo',
    leaderboard: false,
    recruiter: false,
  });
  const answers = {
    interest: 'web',
    strength: 'building',
    level: 'built',
    background: 'student',
    language: 'fr',
    device: 'good',
    style: 'reading',
    time: 'three',
    goal: 'job',
    confidence: 'ready',
  };
  const attempted = {
    ...selected,
    attempts: [{ answers, chosenPath: 'design', completedAt: '2026-10-11' }],
  };
  expect(visibilityFromQuiz(JSON.stringify(attempted))).toMatchObject({
    path: 'design',
    level: 'built',
    language: 'fr',
  });
  expect(visibilityFromQuiz(JSON.stringify({ ...attempted, selections: [] }))).toMatchObject({
    path: 'design',
  });
  expect(
    visibilityFromQuiz(
      JSON.stringify({
        ...attempted,
        selections: [{ ...selected.selections[0], completedAt: '2026-10-12' }],
      }),
    ),
  ).toMatchObject({ path: 'data' });
});
it('ranks commitment before completions and points, uses stable ties and returns at most ten without mutating the source', () => {
  const base: LearnerCard = {
    ...defaultVisibility,
    id: 'base',
    nickname: 'Learner',
    active_days: 1,
    completed: 1,
    xp: 125,
    streak: 1,
    last_active: '2026-10-10',
  };
  const rows = [
    { ...base, id: 'd', xp: 500 },
    { ...base, id: 'c', completed: 2 },
    { ...base, id: 'b', active_days: 2 },
    { ...base, id: 'a', active_days: 2 },
    { ...base, id: 'z', path: 'data' as const },
  ];
  expect(topLearners(rows).map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'z']);
  expect(rows[0].id).toBe('d');
  expect(topLearners(rows, 'data').map((r) => r.id)).toEqual(['z']);
  expect(
    topLearners(Array.from({ length: 12 }, (_, index) => ({ ...base, id: String(index) }))),
  ).toHaveLength(10);
});

import { expect, it } from 'vitest';
import {
  completeCourseQuiz,
  emptyQuiz,
  pathIds,
  readQuiz,
  scoreCourseQuiz,
  scoreAttempt,
  type CourseAnswers,
} from '@/lib/quiz';
import { tasterChoices } from '@/lib/taster';
const ratings = Object.fromEntries(pathIds.map((path) => [path, 'no'])) as CourseAnswers;
it('matches each of the ten curriculum activities independently without demographic filters', () => {
  for (const path of pathIds) {
    const answers = { ...ratings, [path]: 'love' };
    const result = scoreCourseQuiz(answers);
    expect(result.top).toMatchObject({ path, match: 100, points: 3 });
    expect(result.scores.filter((item) => item.points > 0)).toHaveLength(1);
    const state = completeCourseQuiz(emptyQuiz, answers, '2026-10-12', 'yo');
    expect(state.attempts[0].chosenPath).toBe(path);
    expect(scoreAttempt(state.attempts[0])).toEqual(result);
    expect(readQuiz(JSON.stringify(state))).toEqual(state);
    expect(tasterChoices(JSON.stringify(state))).toMatchObject({
      path,
      language: 'yo',
      alternative: null,
    });
  }
});
it('uses the second positive activity for the alternative and explains all ratings', () => {
  const state = completeCourseQuiz(
    emptyQuiz,
    { ...ratings, web: 'love', design: 'interested', data: 'curious' },
    'now',
    'en',
  );
  const result = scoreAttempt(state.attempts[0]);
  expect(result.top.path).toBe('web');
  expect(result.second).toMatchObject({ path: 'design', match: 67 });
  expect(result.scores.find((item) => item.path === 'data')?.match).toBe(33);
  expect(result.top.contributions).toEqual([{ question: 'web', option: 'love', points: 3 }]);
  expect(tasterChoices(JSON.stringify(state))?.alternative).toBe('design');
  expect(scoreCourseQuiz({ ...ratings, data: 'love', web: 'love' }).top.path).toBe('data');
});
it('rejects incomplete, invalid and universally uninterested answers without inventing a match', () => {
  for (const value of [null, {}, { ...ratings, web: 'invalid' }])
    expect(() => scoreCourseQuiz(value)).toThrow();
  expect(() => completeCourseQuiz(emptyQuiz, ratings, 'now', 'en')).toThrow('No course interests');
  const state = completeCourseQuiz(emptyQuiz, { ...ratings, data: 'love' }, 'now', 'en');
  expect(
    completeCourseQuiz(
      { ...state, attempts: Array(25).fill(state.attempts[0]) },
      { ...ratings, web: 'love' },
      'later',
      'fr',
    ).attempts,
  ).toHaveLength(25);
});

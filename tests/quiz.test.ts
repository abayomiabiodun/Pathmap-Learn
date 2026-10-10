import { describe, expect, it } from 'vitest';
import {
  answerOptions,
  answersSchema,
  completeQuiz,
  completeKnownPath,
  emptyQuiz,
  pathIds,
  readQuiz,
  scoreQuiz,
  type QuizAnswers,
} from '@/lib/quiz';
export const answers: QuizAnswers = {
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
describe('quiz scoring', () => {
  it('makes every path reachable and produces bounded, reproducible matches', () => {
    const strengths = {
      data: 'logic',
      web: 'building',
      cyber: 'detail',
      ai: 'logic',
      design: 'creativity',
      marketing: 'people',
      business: 'building',
      writing: 'creativity',
      project: 'detail',
      teaching: 'people',
    } as const;
    for (const path of pathIds) {
      const input = { ...answers, interest: path, strength: strengths[path] };
      const scored = scoreQuiz(input);
      expect(scored.top.path).toBe(path);
      expect(scoreQuiz(input)).toEqual(scored);
      expect(scored.scores).toHaveLength(10);
      expect(scored.second.path).not.toBe(path);
      for (const score of scored.scores) {
        expect(score.match).toBeGreaterThanOrEqual(0);
        expect(score.match).toBeLessThanOrEqual(100);
        expect(score.contributions.every((item) => item.points > 0)).toBe(true);
      }
    }
  });
  it('explains the top contributing answers in weighted order', () => {
    expect(scoreQuiz({ ...answers, background: 'tech' }).top.contributions).toEqual([
      { question: 'interest', option: 'data', points: 6 },
      { question: 'strength', option: 'logic', points: 4 },
      { question: 'background', option: 'tech', points: 1 },
    ]);
  });
  it('breaks equal matches by points then the documented stable path order', () => {
    const scores = scoreQuiz({ ...answers, interest: 'web' });
    const data = scores.scores.find((item) => item.path === 'data')!;
    const ai = scores.scores.find((item) => item.path === 'ai')!;
    expect(data.match).toBe(ai.match);
    expect(data.points).toBe(ai.points);
    expect(scores.second.path).toBe('data');
  });
  it('never changes path scores based on access, language, level, time, goals or confidence', () => {
    const base = scoreQuiz(answers);
    for (const key of [
      'level',
      'language',
      'device',
      'style',
      'time',
      'goal',
      'confidence',
    ] as const) {
      for (const option of answerOptions[key]) {
        const result = scoreQuiz({ ...answers, [key]: option });
        expect(result.scores).toEqual(base.scores);
        expect(result.preferences[key]).toBe(option);
      }
    }
  });
  it('supports every background and strength without mutating input', () => {
    for (const background of answerOptions.background)
      for (const strength of answerOptions.strength) {
        const input = { ...answers, background, strength };
        const before = { ...input };
        expect(scoreQuiz(input).strength).toBe(strength);
        expect(input).toEqual(before);
      }
  });
  it('rejects incomplete or unrecognised answers rather than inventing a recommendation', () => {
    for (const input of [
      null,
      {},
      { ...answers, interest: 'unknown' },
      { ...answers, time: null },
    ]) {
      expect(answersSchema.safeParse(input).success).toBe(false);
      expect(() => scoreQuiz(input)).toThrow();
    }
  });
});
describe('quiz history', () => {
  it('saves manual selections independently and migrates older quiz storage', () => {
    const prior = completeQuiz(emptyQuiz, answers, 'before');
    let state = prior;
    for (let index = 0; index < 26; index++)
      state = completeKnownPath(
        state,
        { interest: 'web', level: 'basics', language: 'fr' },
        String(index),
      );
    expect(state.selections).toHaveLength(25);
    expect(state.selections.at(-1)?.path).toBe('web');
    expect(state.attempts).toEqual(prior.attempts);
    expect(state.draft).toEqual(prior.draft);
    expect(
      readQuiz(JSON.stringify({ version: 1, draft: prior.draft, attempts: prior.attempts })),
    ).toEqual(prior);
    expect(() => completeKnownPath(state, {}, 'now')).toThrow();
  });
  it('restores drafts and rejects corrupt or invalid saved input', () => {
    expect(readQuiz(null)).toEqual(emptyQuiz);
    expect(readQuiz('broken')).toEqual(emptyQuiz);
    expect(readQuiz(JSON.stringify({ ...emptyQuiz, draft: { interest: 'bad' } }))).toEqual(
      emptyQuiz,
    );
    const draft = { ...emptyQuiz, draft: { interest: 'web' as const } };
    expect(readQuiz(JSON.stringify(draft))).toEqual(draft);
  });
  it('keeps the latest 25 completed attempts and preserves previous attempts on retake', () => {
    let state = emptyQuiz;
    for (let index = 0; index < 26; index++) state = completeQuiz(state, answers, String(index));
    expect(state.attempts).toHaveLength(25);
    expect(state.attempts[0].completedAt).toBe('1');
    expect(state.attempts.at(-1)?.chosenPath).toBe('data');
    expect(readQuiz(JSON.stringify(state))).toEqual(state);
    const restarted = { ...state, draft: {} };
    expect(restarted.attempts).toEqual(state.attempts);
    expect(() => completeQuiz(state, {}, 'now')).toThrow();
  });
});

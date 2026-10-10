import * as z from 'zod/mini';
import { pathIds, readQuiz, type PathId } from './quiz';
import { locales } from './preferences';
import { learningDay, lessonIds, lessonKey, type LearningProgress } from './learning';

export const visibilitySchema = z.object({
  nickname: z.string().check(
    z.minLength(2),
    z.maxLength(30),
    z.regex(/^[\p{L}\p{M}\p{N} ._'-]+$/u),
    z.refine((value) => value.trim().length >= 2),
  ),
  path: z.enum(pathIds),
  level: z.enum(['new', 'basics', 'built']),
  language: z.enum(locales),
  location: z.string().check(z.maxLength(80)),
  opportunity: z.enum(['internship', 'job', 'both']),
  leaderboard: z.boolean(),
  recruiter: z.boolean(),
});
export type Visibility = z.infer<typeof visibilitySchema>;
export const defaultVisibility: Visibility = {
  nickname: '',
  path: 'web',
  level: 'new',
  language: 'en',
  location: '',
  opportunity: 'both',
  leaderboard: false,
  recruiter: false,
};
export function visibilityFromQuiz(raw: string | null): Visibility {
  const quiz = readQuiz(raw);
  const known = quiz.selections.at(-1);
  const attempt = quiz.attempts.at(-1);
  if (known && (!attempt || known.completedAt >= attempt.completedAt))
    return { ...defaultVisibility, path: known.path, level: known.level, language: known.language };
  if (attempt)
    return {
      ...defaultVisibility,
      path: attempt.chosenPath,
      level: attempt.answers.level,
      language: attempt.answers.language,
    };
  return defaultVisibility;
}
export function readVisibility(raw: string | null): Visibility {
  try {
    const parsed = visibilitySchema.safeParse(JSON.parse(raw ?? 'null'));
    return parsed.success ? parsed.data : defaultVisibility;
  } catch {
    return defaultVisibility;
  }
}
const ordinal = (day: string) => {
  const timestamp = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === day
    ? Math.floor(timestamp / 86400000)
    : NaN;
};
export function streakStats(days: string[], today: string = learningDay()) {
  const end = ordinal(today);
  const dates = [
    ...new Set(days.map(ordinal).filter((day) => Number.isFinite(day) && day <= end)),
  ].sort((a, b) => a - b);
  let best = 0,
    start = 0,
    lastGap = -1;
  for (let i = 0; i < dates.length; i++) {
    const gap = i === 0 ? 0 : dates[i] - dates[i - 1];
    if (gap > 2) start = i;
    if (gap === 2) {
      if (lastGap > start) start = lastGap;
      lastGap = i;
    }
    best = Math.max(best, i - start + 1);
  }
  let current = 0,
    freezeUsed = false;
  const latest = dates.at(-1);
  if (latest !== undefined && end - latest <= 2) {
    freezeUsed = end - latest === 2;
    current = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      const gap = dates[i] - dates[i - 1];
      if (gap > 2 || (gap === 2 && freezeUsed)) break;
      if (gap === 2) freezeUsed = true;
      current++;
    }
  }
  return {
    current,
    best,
    freezeUsed,
    active30: dates.filter((day) => day > end - 30).length,
    week: dates.filter((day) => day > end - 7).length,
    today: latest === end,
    lastActive:
      latest === undefined ? null : new Date(latest * 86400000).toISOString().slice(0, 10),
  };
}
export function learningStats(progress: LearningProgress, today = learningDay()) {
  const knownKeys = new Set(
    pathIds.flatMap((path) => lessonIds[path].map((id) => lessonKey(path, id))),
  );
  const events = (progress.events ?? []).filter((event) => knownKeys.has(event.lesson));
  const completed = [...knownKeys].filter((key) => progress.lessons[key]?.completed).length;
  const stats = streakStats(
    events.map((event) => event.day),
    today,
  );
  return {
    ...stats,
    completed,
    xp:
      completed * 100 +
      new Set(
        events.filter((event) => ordinal(event.day) <= ordinal(today)).map((event) => event.day),
      ).size *
        25,
  };
}
export type LearnerCard = {
  id: string;
  nickname: string;
  path: PathId;
  level: Visibility['level'];
  language: Visibility['language'];
  location: string;
  opportunity: Visibility['opportunity'];
  active_days: number;
  completed: number;
  xp: number;
  streak: number;
  last_active: string | null;
};
export function topLearners(learners: LearnerCard[], path?: PathId) {
  return learners
    .filter((learner) => !path || learner.path === path)
    .sort(
      (a, b) =>
        b.active_days - a.active_days ||
        b.completed - a.completed ||
        b.xp - a.xp ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 10);
}

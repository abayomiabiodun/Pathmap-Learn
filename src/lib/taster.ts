import * as z from 'zod/mini';
import { learningPathFromQuiz, pathIds, readQuiz, scoreQuiz, type QuizStorage } from './quiz';

export const tasterRatings = ['loved', 'okay', 'not-for-me'] as const;
const tasterSchema = z.object({
  version: z.literal(1),
  sessions: z
    .array(
      z.object({
        path: z.enum(pathIds),
        rating: z.enum(tasterRatings),
        completedAt: z.string(),
        practice: z.string().check(z.maxLength(10000)),
        attempts: z.number().check(z.minimum(3), z.multipleOf(1)),
      }),
    )
    .check(z.maxLength(25)),
});
export type TasterStorage = z.infer<typeof tasterSchema>;
export const emptyTaster: TasterStorage = { version: 1, sessions: [] };
export function readTaster(raw: string | null): TasterStorage {
  try {
    const parsed = tasterSchema.safeParse(JSON.parse(raw ?? 'null'));
    return parsed.success ? parsed.data : emptyTaster;
  } catch {
    return emptyTaster;
  }
}
export function tasterChoices(raw: string | null) {
  const quiz = readQuiz(raw);
  const selected = learningPathFromQuiz(raw);
  if (!selected) return null;
  const attempt = quiz.attempts.at(-1);
  const known = quiz.selections.at(-1);
  // A known-path choice has no assessment ranking: never invent a second-best match.
  const assessed = !!attempt && (!known || attempt.completedAt >= known.completedAt);
  const ranking = assessed ? scoreQuiz(attempt!.answers) : null;
  return {
    path: selected,
    alternative: ranking?.scores.find((item) => item.path !== selected)?.path ?? null,
    language: assessed ? attempt!.answers.language : known!.language,
    level: assessed ? attempt!.answers.level : known!.level,
  };
}
export function acceptTaster(
  quiz: QuizStorage,
  path: (typeof pathIds)[number],
  at: string,
): QuizStorage {
  const choice = tasterChoices(JSON.stringify(quiz));
  if (!choice || (path !== choice.path && path !== choice.alternative))
    throw new Error('Unmatched taster');
  // Update the active assessment so its ranking remains available for a second taster.
  const latest = quiz.attempts.at(-1);
  const known = quiz.selections.at(-1);
  if (latest && (!known || latest.completedAt >= known.completedAt)) {
    return { ...quiz, attempts: [...quiz.attempts.slice(0, -1), { ...latest, chosenPath: path }] };
  }
  return {
    ...quiz,
    selections: [
      ...quiz.selections,
      { path, level: choice.level, language: choice.language, completedAt: at },
    ].slice(-25),
  };
}

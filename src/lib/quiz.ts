import * as z from 'zod/mini';
import { locales } from './preferences';

// Path order is also the stable tie-break order. Add paths here before extending the matrix.
export const pathIds = [
  'data',
  'web',
  'cyber',
  'ai',
  'design',
  'marketing',
  'business',
  'writing',
  'project',
  'teaching',
] as const;
export type PathId = (typeof pathIds)[number];
export const courseRatings = ['love', 'interested', 'curious', 'no'] as const;
const courseShape = {
  data: z.enum(courseRatings),
  web: z.enum(courseRatings),
  cyber: z.enum(courseRatings),
  ai: z.enum(courseRatings),
  design: z.enum(courseRatings),
  marketing: z.enum(courseRatings),
  business: z.enum(courseRatings),
  writing: z.enum(courseRatings),
  project: z.enum(courseRatings),
  teaching: z.enum(courseRatings),
};
export const courseAnswersSchema = z.object(courseShape);
const courseDraftSchema = z.partial(courseAnswersSchema);
export type CourseAnswers = z.infer<typeof courseAnswersSchema>;
const courseStrengths = {
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
export function scoreCourseQuiz(input: unknown) {
  const answers = courseAnswersSchema.parse(input);
  const points = { love: 3, interested: 2, curious: 1, no: 0 };
  const scores = pathIds
    .map((path) => ({
      path,
      points: points[answers[path]],
      match: Math.round((points[answers[path]] / 3) * 100),
      contributions:
        points[answers[path]] > 0
          ? [{ question: path, option: answers[path], points: points[answers[path]] }]
          : [],
    }))
    .sort((a, b) => b.points - a.points || pathIds.indexOf(a.path) - pathIds.indexOf(b.path));
  return { top: scores[0], second: scores[1], scores, strength: courseStrengths[scores[0].path] };
}
export const pathNameKeys: Record<PathId, string> = {
  data: 'ui_data',
  web: 'ui_web_development',
  cyber: 'ui_cybersecurity',
  ai: 'ui_ai_and_machine_learning',
  design: 'ui_ui_ux_design',
  marketing: 'ui_digital_marketing',
  business: 'ui_business_and_entrepreneurship',
  writing: 'ui_writing_and_communication',
  project: 'ui_project_management',
  teaching: 'ui_teaching_and_facilitation',
};
export const questionIds = [
  'interest',
  'strength',
  'level',
  'background',
  'language',
  'device',
  'style',
  'time',
  'goal',
  'confidence',
] as const;
export type QuestionId = (typeof questionIds)[number];
export const answerOptions = {
  interest: pathIds,
  strength: ['logic', 'building', 'creativity', 'people', 'detail'],
  level: ['new', 'basics', 'built'],
  background: ['student', 'teacher', 'trader', 'marketer', 'service', 'tech', 'other'],
  language: locales,
  device: ['low', 'phone', 'offline', 'good'],
  style: ['video', 'reading', 'projects', 'games'],
  time: ['one', 'three', 'five'],
  goal: ['job', 'freelance', 'scholarship', 'switch', 'growth'],
  confidence: ['ready', 'unsure', 'support'],
} as const;
export const answersSchema = z.object({
  interest: z.enum(answerOptions.interest),
  strength: z.enum(answerOptions.strength),
  level: z.enum(answerOptions.level),
  background: z.enum(answerOptions.background),
  language: z.enum(answerOptions.language),
  device: z.enum(answerOptions.device),
  style: z.enum(answerOptions.style),
  time: z.enum(answerOptions.time),
  goal: z.enum(answerOptions.goal),
  confidence: z.enum(answerOptions.confidence),
});
export type QuizAnswers = z.infer<typeof answersSchema>;
export const draftSchema = z.partial(answersSchema);
export type QuizDraft = z.infer<typeof draftSchema>;

// Only interests (6), self-reported strengths (4), and relevant background (2) score paths.
// Each matrix value is 0–1, multiplied by the question's weight. All other answers
// tailor future resources/goals; language, equipment, time and confidence never limit a path.
const weights = { interest: 6, strength: 4, background: 2 } as const;
type Points = Partial<Record<PathId, number>>;
const strengthMatrix: Record<QuizAnswers['strength'], Points> = {
  logic: { data: 1, ai: 1, cyber: 0.75, web: 0.5, project: 0.25 },
  building: { web: 1, business: 0.75, ai: 0.5, design: 0.5, project: 0.25 },
  creativity: { design: 1, writing: 1, marketing: 0.75, business: 0.25, web: 0.25 },
  people: { teaching: 1, marketing: 1, business: 0.75, project: 0.75, writing: 0.5 },
  detail: { cyber: 1, project: 1, data: 0.75, writing: 0.5, design: 0.5 },
};
const backgroundMatrix: Record<QuizAnswers['background'], Points> = {
  student: {},
  teacher: { teaching: 1, writing: 0.5, project: 0.25 },
  trader: { business: 1, marketing: 0.5, data: 0.25 },
  marketer: { marketing: 1, writing: 0.5, design: 0.25 },
  service: { project: 1, teaching: 0.5, business: 0.5 },
  tech: { web: 1, cyber: 0.5, ai: 0.5, data: 0.5 },
  other: {},
};
export type Contribution = { question: keyof typeof weights; option: string; points: number };
export function scoreQuiz(input: unknown) {
  const answers = answersSchema.parse(input);
  const scores = pathIds
    .map((path) => {
      const contributions: Contribution[] = [
        {
          question: 'interest',
          option: answers.interest,
          points: answers.interest === path ? weights.interest : 0,
        },
        {
          question: 'strength',
          option: answers.strength,
          points: (strengthMatrix[answers.strength][path] ?? 0) * weights.strength,
        },
        {
          question: 'background',
          option: answers.background,
          points: (backgroundMatrix[answers.background][path] ?? 0) * weights.background,
        },
      ];
      const points = contributions.reduce((sum, item) => sum + item.points, 0);
      const maximum =
        weights.interest +
        Math.max(...Object.values(strengthMatrix).map((row) => row[path] ?? 0)) * weights.strength +
        Math.max(...Object.values(backgroundMatrix).map((row) => row[path] ?? 0)) *
          weights.background;
      return {
        path,
        points,
        match: Math.round((points / maximum) * 100),
        contributions: contributions
          .filter((item) => item.points > 0)
          .sort((a, b) => b.points - a.points),
      };
    })
    .sort(
      (a, b) =>
        b.match - a.match ||
        b.points - a.points ||
        pathIds.indexOf(a.path) - pathIds.indexOf(b.path),
    );
  return {
    top: scores[0],
    second: scores[1],
    scores,
    strength: answers.strength,
    preferences: {
      level: answers.level,
      language: answers.language,
      device: answers.device,
      style: answers.style,
      time: answers.time,
      goal: answers.goal,
      confidence: answers.confidence,
    },
  };
}
export const attemptSchema = z.object({
  answers: answersSchema,
  courseAnswers: z.optional(courseAnswersSchema),
  completedAt: z.string(),
  chosenPath: z.enum(pathIds),
});
const storageSchema = z.object({
  version: z.literal(1),
  draft: draftSchema,
  courseDraft: z._default(courseDraftSchema, {}),
  attempts: z.array(attemptSchema).check(z.maxLength(25)),
  knownDraft: z._default(
    z.partial(z.pick(answersSchema, { interest: true, level: true, language: true })),
    {},
  ),
  selections: z._default(
    z
      .array(
        z.object({
          path: z.enum(pathIds),
          level: z.enum(answerOptions.level),
          language: z.enum(locales),
          completedAt: z.string(),
        }),
      )
      .check(z.maxLength(25)),
    [],
  ),
});
export type QuizStorage = z.infer<typeof storageSchema>;
export const emptyQuiz: QuizStorage = {
  version: 1,
  draft: {},
  courseDraft: {},
  attempts: [],
  knownDraft: {},
  selections: [],
};
export const knownPathSchema = z.pick(answersSchema, {
  interest: true,
  level: true,
  language: true,
});
export function completeKnownPath(
  state: QuizStorage,
  input: unknown,
  completedAt: string,
): QuizStorage {
  const answers = knownPathSchema.parse(input);
  return {
    ...state,
    knownDraft: {},
    selections: [
      ...state.selections,
      { path: answers.interest, level: answers.level, language: answers.language, completedAt },
    ].slice(-25),
  };
}
export function readQuiz(raw: string | null): QuizStorage {
  try {
    const parsed = storageSchema.safeParse(raw ? JSON.parse(raw) : emptyQuiz);
    return parsed.success ? parsed.data : emptyQuiz;
  } catch {
    return emptyQuiz;
  }
}
export function learningPathFromQuiz(raw: string | null): PathId | null {
  const quiz = readQuiz(raw);
  const known = quiz.selections.at(-1);
  const attempt = quiz.attempts.at(-1);
  if (known && (!attempt || known.completedAt >= attempt.completedAt)) return known.path;
  return attempt?.chosenPath ?? null;
}
export function completeQuiz(
  state: QuizStorage,
  answers: unknown,
  completedAt: string,
): QuizStorage {
  const validAnswers = answersSchema.parse(answers);
  return {
    ...state,
    version: 1,
    draft: validAnswers,
    attempts: [
      ...state.attempts,
      {
        answers: validAnswers,
        completedAt,
        chosenPath: scoreQuiz(validAnswers).top.path,
      },
    ].slice(-25),
  };
}

export function completeCourseQuiz(
  state: QuizStorage,
  input: unknown,
  completedAt: string,
  language: QuizAnswers['language'],
): QuizStorage {
  const courseAnswers = courseAnswersSchema.parse(input);
  const result = scoreCourseQuiz(courseAnswers);
  if (result.top.points === 0) throw new Error('No course interests');
  const answers: QuizAnswers = {
    interest: result.top.path,
    strength: result.strength,
    level: 'new',
    background: 'other',
    language,
    device: 'low',
    style: 'projects',
    time: 'one',
    goal: 'growth',
    confidence: 'unsure',
  };
  return {
    ...state,
    courseDraft: courseAnswers,
    attempts: [
      ...state.attempts,
      { answers, courseAnswers, completedAt, chosenPath: result.top.path },
    ].slice(-25),
  };
}
export function scoreAttempt(attempt: z.infer<typeof attemptSchema>) {
  return attempt.courseAnswers
    ? scoreCourseQuiz(attempt.courseAnswers)
    : scoreQuiz(attempt.answers);
}

import * as z from 'zod/mini';
import { pathIds, type PathId } from './quiz';

export const lessonIds = {
  web: ['html', 'css', 'javascript'],
  data: ['data'],
  cyber: ['cyber'],
  ai: ['ai'],
  design: ['design'],
  marketing: ['marketing'],
  business: ['business'],
  writing: ['writing'],
  project: ['project'],
  teaching: ['teaching'],
} satisfies Record<PathId, string[]>;
export type Lesson = {
  title: string;
  body: string;
  practice: string;
  statement: string;
  answer: boolean;
  code?: string;
};
const progressSchema = z.object({
  version: z.literal(1),
  lessons: z.record(z.string(), z.object({ draft: z.string(), completed: z.boolean() })),
  events: z.optional(
    z.array(
      z.object({ day: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/)), lesson: z.string() }),
    ),
  ),
});
export type LearningProgress = z.infer<typeof progressSchema>;
export const emptyProgress: LearningProgress = { version: 1, lessons: {} };
export function readProgress(raw: string | null): LearningProgress {
  try {
    const parsed = progressSchema.safeParse(JSON.parse(raw ?? 'null'));
    return parsed.success ? parsed.data : emptyProgress;
  } catch {
    return emptyProgress;
  }
}
export function lessonKey(path: PathId, lesson: string) {
  return `${path}/${lesson}`;
}
export function courseProgress(path: PathId, progress: LearningProgress) {
  const ids = lessonIds[path];
  const completed = ids.filter((id) => progress.lessons[lessonKey(path, id)]?.completed).length;
  return {
    completed,
    total: ids.length,
    next: ids.find((id) => !progress.lessons[lessonKey(path, id)]?.completed) ?? ids[0],
  };
}
export function validPath(value: string): value is PathId {
  return pathIds.some((path) => path === value);
}
let calendar: Intl.DateTimeFormat | undefined;
export function learningDay(at: Date = new Date()) {
  calendar ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    calendar.formatToParts(at).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function markLessonComplete(
  progress: LearningProgress,
  path: PathId,
  id: string,
  at: Date = new Date(),
): LearningProgress {
  const key = lessonKey(path, id);
  if (!lessonIds[path].includes(id) || [...(progress.lessons[key]?.draft.trim() ?? '')].length < 20)
    throw new Error('Invalid practice');
  const day = learningDay(at);
  const events = progress.events ?? [];
  return {
    ...progress,
    lessons: { ...progress.lessons, [key]: { ...progress.lessons[key], completed: true } },
    events: events.some((event) => event.day === day && event.lesson === key)
      ? events
      : [...events, { day, lesson: key }],
  };
}

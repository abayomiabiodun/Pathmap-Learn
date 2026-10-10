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

import { answerOptions } from './quiz';
// Runs before the course markup is painted; uses the same persisted quiz contract.
export function restoreLearningPath(options: Record<string, readonly string[]>) {
  document.documentElement.dataset.learningPath = '';
  try {
    const value = JSON.parse(localStorage.getItem('pathmap-quiz-v1') ?? 'null');
    const record = (item: unknown): item is Record<string, unknown> =>
      !!item && typeof item === 'object' && !Array.isArray(item);
    const fields = (item: unknown, keys: string[], partial = false) =>
      record(item) &&
      keys.every(
        (key) => (partial && item[key] === undefined) || options[key].includes(item[key] as string),
      );
    const keys = Object.keys(options);
    const knownKeys = ['interest', 'level', 'language'];
    const courseFields = (item: unknown, partial = false) =>
      record(item) &&
      options.interest.every(
        (path) =>
          (partial && item[path] === undefined) ||
          ['love', 'interested', 'curious', 'no'].includes(item[path] as string),
      );
    if (
      !record(value) ||
      value.version !== 1 ||
      !fields(value.draft, keys, true) ||
      (value.courseDraft !== undefined && !courseFields(value.courseDraft, true)) ||
      !Array.isArray(value.attempts) ||
      value.attempts.length > 25 ||
      (value.knownDraft !== undefined && !fields(value.knownDraft, knownKeys, true))
    )
      return;
    const attempts = value.attempts;
    const selections = value.selections === undefined ? [] : value.selections;
    if (
      !Array.isArray(selections) ||
      selections.length > 25 ||
      !attempts.every(
        (item) =>
          record(item) &&
          fields(item.answers, keys) &&
          (item.courseAnswers === undefined || courseFields(item.courseAnswers)) &&
          typeof item.completedAt === 'string' &&
          options.interest.includes(item.chosenPath as string),
      ) ||
      !selections.every(
        (item) =>
          record(item) &&
          options.interest.includes(item.path as string) &&
          options.level.includes(item.level as string) &&
          options.language.includes(item.language as string) &&
          typeof item.completedAt === 'string',
      )
    )
      return;
    const known = selections.at(-1);
    const attempt = attempts.at(-1);
    document.documentElement.dataset.learningPath =
      known && (!attempt || known.completedAt >= attempt.completedAt)
        ? known.path
        : (attempt?.chosenPath ?? '');
  } catch {
    /* Keep all course workspaces hidden if device storage cannot be read. */
  }
}
export const learningBootstrapScript = `(${restoreLearningPath.toString()})(${JSON.stringify(answerOptions)});`;

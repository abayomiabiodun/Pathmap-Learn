import { courseOutline } from './course-outline';
import type { Lesson } from './learning';

export type Knowledge = {
  id: string;
  title: string;
  body: string;
  href: string;
  path?: string;
  practice?: string;
  code?: string;
};
export type Answer = { sources: Knowledge[]; followUp: boolean };
export const guides = [
  ['assessment', '/quiz', 'start'],
  ['known', '/quiz?skip=true', 'ui_i_already_know_my_path'],
  ['taster', '/taster', 'taster_try'],
  ['learning', '/learn', 'eng_continue'],
  ['library', '/library', 'library'],
  ['streak', '/dashboard', 'eng_streak'],
  ['circle', '/circles/join', 'comm_join'],
  ['checkin', '/circles/check-in', 'comm_checkin'],
  ['mentor', '/circles/mentors', 'comm_mentors'],
  ['volunteer', '/circles/become-mentor', 'comm_become_mentor'],
  ['showcase', '/showcase', 'show_title'],
  ['recruiter', '/recruiter', 'eng_recruiter'],
  ['account', '/auth', 'signIn'],
  ['privacy', '/privacy', 'privacy'],
  ['preferences', '/', 'language'],
  ['offline', '/offline', 'offline'],
  ['paths', '/paths', 'ui_explore_all_10_paths'],
  ['assistant', '/assistant', 'assistant_label'],
] as const;

export function lessonKnowledge(catalog: Record<string, Lesson>): Knowledge[] {
  return Object.entries(courseOutline).flatMap(([path, ids]) =>
    ids
      .filter((id) => catalog[id])
      .map((id) => ({
        id,
        path,
        title: catalog[id].title,
        body: catalog[id].body,
        practice: catalog[id].practice,
        code: catalog[id].code,
        href: `/learn/${path}?lesson=${id}`,
      })),
  );
}
export function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
const noise = new Set(
  normalize(
    'stuck confused simpler hint again ri give what is a an the how can i my me to for of in on and it this that please help explain tell about why do does are with you your am want need more example examples understand show not know learn course lesson que quoi comment le la les de du des un une je tu vous mon ma est et pour dans moi expliquer aide o que como e ki ni mo mi ati se bi bawo jowo na wannan ne menene yaya ina da ka ta don taimaka bụ bu kedu ka ihe m na nke biko wetin dey fit abi dis dem we una',
  ).split(/\s+/),
);
function words(value: string) {
  return [...new Set(normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [])].filter(
    (word) => word.length > 1 && !noise.has(word),
  );
}
const searchText = (document: Knowledge) =>
  `${document.body} ${document.practice ?? ''} ${document.code ?? ''}`;
const followUps =
  /\b(example|examples|practice|hint|simpler|again|why|confused|stuck|understand|exemple|exemples|pratique|indice|encore|pourquoi|comprendre|apeere|apere|iranlowo|misali|fahimta|atụ|atu|nghota|enyemaka|abeg)\b/u;

// Return only published LMS material. Never invent an answer from a weak match.
export function answerQuestion(
  query: string,
  documents: Knowledge[],
  previousId?: string,
  path?: string,
): Answer {
  const terms = words(query);
  const normalized = normalize(query);
  const previous = documents.find((document) => document.id === previousId);
  const frequency = new Map<string, number>();
  for (const document of documents) {
    for (const term of words(searchText(document)))
      frequency.set(term, (frequency.get(term) ?? 0) + 1);
  }
  const matches = documents
    .map((document) => {
      const title = words(document.title + ' ' + document.id);
      const body = new Set(words(searchText(document)));
      const score = terms.reduce(
        (sum, term) =>
          sum +
          (title.includes(term) ? 5 : body.has(term) ? (frequency.get(term)! <= 5 ? 4 : 1) : 0),
        0,
      );
      return {
        document,
        score,
        coverage: terms.filter((term) => title.includes(term) || body.has(term)).length,
      };
    })
    .filter(
      ({ document, score, coverage }) =>
        (!path || !document.path || document.path === path) &&
        score >= 3 &&
        (coverage >= 2 || score >= 4),
    )
    .sort((a, b) => b.score - a.score);
  if (
    previous &&
    (!path || !previous.path || previous.path === path) &&
    followUps.test(normalized) &&
    (terms.length === 0 || (terms.length === 1 && !matches.length))
  )
    return { sources: [previous], followUp: true };
  return { sources: matches.slice(0, 2).map(({ document }) => document), followUp: false };
}

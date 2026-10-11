# Path quiz

`/quiz?skip=true` is the three-step known-path flow: select one of ten paths,
choose a starting level, then choose a learning language. It saves a separate
selection history and shows the chosen path's practical first step. It does not
invent strengths or match percentages. Editing these choices preserves quiz
drafts and attempts. Older stored quiz records migrate with empty manual fields.

`/quiz` asks ten questions, one per screen. Answers autosave on the current device;
reopening the quiz resumes at the first unanswered question. Back revisits an answer.
Reopening a completed assessment offers its results or a fresh retake. Both
journeys link to each other, and the saved indicator appears only after an answer
has actually been stored.
`/quiz/results` shows a self-reported strength, two recommendations, contributing
answers, all ten match scores and a practical first step. A learner can choose the
alternative or retake the quiz. Retakes preserve the latest 25 completed attempts
and do not touch other app storage. No Supabase connection is required for this
local flow. Results lead to the 10–15 minute `/taster` game and then the focused
ten-lesson course. Known-path learners can also start their chosen course directly.
Account syncing remains later work.

The latest completed assessment or manual choice controls the taster and course.
An older manual choice does not appear as the current selection after a newer
assessment. Older assessment results remain available for review, but show the
current path and require an explicit action to use that result again. Choosing an
alternative from an older result also makes that assessment current. A manual
choice wins an identical timestamp consistently across learning and tasters.

## Scoring

The pure `scoreQuiz` function in `src/lib/quiz.ts` validates complete answers with
Zod. Interests contribute up to 6 points, strengths up to 4, and relevant background
up to 2. The strength/background matrices contain factors between 0 and 1. Student
and other backgrounds add no points; every path remains reachable for a beginner.
Level, language, access/device, learning style, available time, goal and confidence
are retained as preferences and never change path scores.

Each path's percentage is its points divided by its maximum attainable points,
rounded to the nearest integer. These independent matches do not sum to 100.
Rank by percentage, then raw points, then the stable `pathIds` order. Explanations
list positive contributing answers in descending points. These are transparent
guidance scores, not a validated aptitude assessment or a forecast of success.

To extend scoring, update path IDs, message keys, answer schemas and the matrices,
then prove reachability and tie behavior in `tests/quiz.test.ts`. Translate new UI
messages in all six catalogs. Storage uses a versioned, validated payload;
malformed input resets to an empty draft. Failed browser writes show an error and
prevent completion from falsely reporting a saved result.

## Checks

Unit tests cover every path, all preference filters, backgrounds, strengths,
tie-breaking, explanations, invalid input and retained history. Component tests
cover answer requirements, back, resume, completion, results, switching, retake
and storage failures. Playwright covers desktop/mobile, accessibility, French
translation and offline completion. The public service worker caches quiz HTML
and static assets, never submitted answers or account/API responses.

Validated on 11 October 2026: 112 unit/component tests passed with 100% library
coverage; lint, TypeScript and the production build passed. Sixteen relevant
desktop/mobile browser scenarios passed, including completed-result reopening,
manual selection to older assessment switching, French copy, offline completion,
tasters and ten-lesson courses. The new switching scenario was rerun after
correcting its expected learning-link label.

Three Lighthouse runs per page under 4G throttling and 4× CPU slowdown passed
all assertions. Median LCP: assessment 1,682 ms, known path 1,968 ms, results
1,509 ms, taster 1,952 ms and sign-in 1,989 ms. Every run scored 100% automated
accessibility. Script transfer stayed below the 204,800-byte budget for all five
pages. The public shell cache is version 19 so returning devices get the updates.

# Path quiz

`/quiz` asks ten questions, one per screen. Answers autosave on the current device;
reopening the quiz resumes at the first unanswered question. Back revisits an answer.
`/quiz/results` shows a self-reported strength, two recommendations, contributing
answers, all ten match scores and a practical first step. A learner can choose the
alternative or retake the quiz. Retakes preserve the latest 25 completed attempts
and do not touch other app storage. No Supabase connection is required for this
local flow. Account syncing and the taster/library pipeline remain later work.

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

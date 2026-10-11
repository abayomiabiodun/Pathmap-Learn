# Ten-lesson courses and a path taster

Every path now has ten ordered foundation lessons. Existing lesson IDs are preserved, so earlier drafts, completions and streak records still count; the next unfinished lesson opens as before. The six lesson catalogs contain 100 lessons each, with a teaching point, explanation, exercise and true/false check. Examples are displayed as text, not executed or automatically graded. These courses introduce foundational skills rather than certifying job readiness.

The main assessment-results action opens `/taster`. The known-path confirmation and focused learning card also link there. The page links back to the path quiz and requires a completed assessment or saved explicit choice before starting. A suggested 10–15 minute session includes three clue-and-answer rounds, unlimited retries, earned stars and a small practical response. After at least 20 characters of practice, learners choose Loved it, Okay or Not for me. Timing is guidance rather than a forced countdown.

Loved it and Okay accept the previewed course. Not for me saves the rating and offers the next highest-scoring assessment match without changing the course. Accepting the alternative taster updates the saved path; Continue learning and My library still show only that path. If a learner rejects both candidates, or chose a path without taking an assessment, the app offers the quiz rather than inventing a second-best score.

`pathmap-taster-v1` keeps up to 25 completed ratings, practice responses and attempt counts on the device. Reloading restarts a game, while completed records and accepted path choices remain saved. Tasters award no verified completions, XP or streak days. Records are not sent to other learners or recruiters. Save and content-load failures are recoverable. All taster interface text is supplied in all six supported languages; technical examples retain programming syntax. Native-speaker review of authored translations remains part of launch preparation.

The additive `20261011000100_ten_lessons.sql` migration registers 88 new lesson checks in the server catalog. It retains existing activity and uses the same RPC and RLS rules. Apply it to a configured Supabase project before relying on new completions for shared rankings. Browser shells and lesson caches are versioned to replace the earlier outlines.

To regenerate the expansion and copy, run `node scripts/expand-learning-content.mjs` and `node scripts/create-taster-copy.mjs`. The original course generator also runs these expansion steps. Topic notes and translated concept checks are stored in the adjacent source modules.

## Validation — 2026-10-11

Lint, type checking and the production build pass. All 109 unit/component tests pass, with 94.99% overall line coverage and 100% coverage of the pure library modules. The 22 relevant desktop/mobile browser cases pass; the four taster cases were repeated successfully after the final quiz-restart correction. Tests include completing all ten web lessons, all course routes, retained Yoruba work offline, rating and accepting an alternative, focused continuation, French taster content, layout and accessibility. The local PGlite PostgreSQL tests pass clean catalog migration, answer parity, new-lesson completion and RLS isolation alongside the existing community checks.

All 21 final Lighthouse runs pass the configured checks: three per URL, with 4G throttling and CPU slowdown of four. Accessibility is 100 for every run, and script transfer stays within 204800 bytes (maximum 204688).

| Page            | Median LCP (ms) |
| --------------- | --------------: |
| `/learn`        |            1252 |
| `/library`      |            1393 |
| `/learn/web`    |            2248 |
| `/quiz`         |            1723 |
| `/quiz/results` |            1394 |
| `/taster`       |            1960 |
| `/auth`         |            1935 |

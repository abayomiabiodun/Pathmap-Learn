# Local learning space

The quiz recommendation offers a game-based taster before starting the matched course. The known-path confirmation also offers a taster or direct start. Starting from either onboarding screen applies the chosen language. `/library` and `/learn` show only the learner’s saved path and progress; see [focused learning](focused-learning.md) and [tasters](taster.md).

Each of the ten paths has ten beginner lessons, ending in a practical project. These are foundation courses, not complete career curricula or accredited qualifications. All 100 lessons have authored reading, a practice prompt and a true/false knowledge check in English, Nigerian Pidgin, Yorùbá, Hausa, Igbo and French. Native-speaker review remains a launch requirement.

Learners write practice notes or code, then answer the knowledge check. A correct answer and a practice response of at least 20 characters allow completion. Practice is self-directed; the system does not execute, grade or assess submitted code. Examples are displayed as text. Lessons can be reviewed freely. Returning to a course opens its first unfinished lesson.

`pathmap-learning-v1` stores versioned drafts, completion flags and optional dated activity events in localStorage. Progress is independent for each path and survives reloads. Invalid storage resets safely; write failures display an error and never claim a successful save. Clearing browser storage removes device history. When signed in to configured Supabase, new completed practices are separately recorded by the server for shared rankings; offline history is not imported as verified activity. See [streaks and recruiter access](engagement.md).

The ten public course pages are prerendered with their English lesson content, so reading does not wait for JavaScript or a separate content request. Only the chosen course's content is passed from the server. Other languages load their lesson JSON when selected. The service worker caches public course documents and translated lesson JSON after they are opened while connected. Course documents are fetched explicitly because Next client navigation normally requests RSC, which is excluded from offline caching. Lesson content stays out of the home/auth/quiz JavaScript bundles. No private account responses or API data are cached.

Unit and browser tests cover progress recovery, completion requirements, incorrect answers, storage failures, language changes, all ten course routes, phone layout, accessibility and studying offline. Account syncing of local drafts, richer assessments and instructor management require later product phases.

## Validation

On 2026-10-10, `pnpm check` passed lint, type checking, all 51 unit/component tests, the production build and 44 desktop/mobile browser tests. Overall line coverage was 99.31%; pure library modules had 100% coverage. The final Lighthouse retest ran three measurements each for `/learn/web`, `/library` and `/auth`: accessibility scored 100, median LCP stayed below 2,500ms and script transfer stayed below 204,800 bytes. The Web Development course's median LCP was 2,092ms. Home, quiz and known-path pages passed their budgets in the preceding full collection.

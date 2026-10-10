# Local learning space

Both the known-path confirmation and quiz recommendation lead directly to `/learn/<chosen-path>`. Starting a course applies the language chosen during onboarding. `/library` and `/learn` list all ten starter courses and their progress.

Web Development has three beginner lessons: HTML structure, CSS presentation and JavaScript interaction. The other nine paths each have one introductory lesson. These are short foundation courses, not complete career curricula or accredited qualifications. All twelve lessons have authored reading, a practice prompt and a true/false knowledge check in English, Nigerian Pidgin, Yorùbá, Hausa, Igbo and French. Native-speaker review remains a launch requirement.

Learners write practice notes or code, then answer the knowledge check. A correct answer and a practice response of at least 20 characters allow completion. Practice is self-directed; the system does not execute, grade or assess submitted code. Examples are displayed as text. Lessons can be reviewed freely. Returning to a course opens its first unfinished lesson.

`pathmap-learning-v1` stores versioned drafts and completion flags in localStorage. Progress is independent for each path and survives reloads. Invalid storage resets safely; write failures display an error and never claim a successful save. This is device-local storage, not account-linked Supabase progress. Clearing browser storage removes it.

The ten public course pages are prerendered with their English lesson content, so reading does not wait for JavaScript or a separate content request. Only the chosen course's content is passed from the server. Other languages load their lesson JSON when selected. The service worker caches public course documents and translated lesson JSON after they are opened while connected. Course documents are fetched explicitly because Next client navigation normally requests RSC, which is excluded from offline caching. Lesson content stays out of the home/auth/quiz JavaScript bundles. No private account responses or API data are cached.

Unit and browser tests cover progress recovery, completion requirements, incorrect answers, storage failures, language changes, all ten course routes, phone layout, accessibility and studying offline. Full course expansion, account syncing, richer assessments and instructor management require later product phases.

## Validation

On 2026-10-10, `pnpm check` passed lint, type checking, all 51 unit/component tests, the production build and 44 desktop/mobile browser tests. Overall line coverage was 99.31%; pure library modules had 100% coverage. The final Lighthouse retest ran three measurements each for `/learn/web`, `/library` and `/auth`: accessibility scored 100, median LCP stayed below 2,500ms and script transfer stayed below 204,800 bytes. The Web Development course's median LCP was 2,092ms. Home, quiz and known-path pages passed their budgets in the preceding full collection.

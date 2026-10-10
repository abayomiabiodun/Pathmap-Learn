# Continue the assigned path

`/learn` and `/library` show one course, derived from the latest completed path assessment or explicit saved path choice. The learner’s existing lesson drafts and completion records determine progress and the next unfinished lesson. Unfinished assessments and corrupt or absent device data do not select a default course; learners are directed to `/quiz` instead.

Direct `/learn/[path]` links also check the saved selection. A different course shows a link back to the assigned course rather than its lesson workspace. This is a navigation rule, not a server authorization boundary: course material remains public, while the current prototype stores path selection and progress on the learner’s device. Changing a path through the assessment or the existing deliberate path-choice flow updates the course. Earlier work is retained without listing unrelated courses.

The dashboard’s Continue learning link uses `/learn`, so editable recruiter-profile path fields cannot send a learner to an unrelated course. The service-worker shell version is updated to replace the earlier course-list screens.

An early browser check validates the saved quiz shape and reveals only the matching static course before React hydration. Missing, malformed or unavailable storage keeps all course workspaces hidden. The full quiz reader verifies the choice again after hydration; progress and private practice notes remain restored on the client. Performance fixtures prepare selection in a static SVG document so app fonts and workers are not warmed by the preparation step.

Validation: all 100 unit/component tests pass, with 100% coverage of the pure learning-selection helpers. Twelve related desktop/mobile browser cases pass, plus both library-navigation cases. The final three-run Lighthouse checks pass for /learn, /library, /learn/web and /auth: median LCP is 1064, 933, 1225 and 1506 milliseconds respectively, with accessibility 100 and JavaScript within the 204800-byte budget.

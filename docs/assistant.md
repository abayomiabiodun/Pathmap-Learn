# Course-based learning assistant

Open `/assistant`, use the floating Learning assistant link or select it in the hamburger menu. No AI account or key is required. The assistant retrieves published LMS material rather than generating unrestricted answers.

## Knowledge and conversation

The selected language's `/lessons/{locale}.json` supplies all 100 lessons across ten courses. The assistant indexes titles, explanations, practice tasks and examples, and adds eighteen translated guides covering assessment, chosen paths, tasters, learning, library, streaks, circles, check-ins, mentors, mentoring, showcase, recruiters, accounts, privacy, preferences, offline use, path exploration and the assistant itself. Changes to the lesson catalogs are picked up on the next load; guide copy lives in the message catalogs.

Questions match normalized words with accent-insensitive lookup and extra weight for titles and uncommon concepts. A course filter defaults to the learner's assessed or selected path; platform guidance remains available. Follow-up requests for examples retain the previous topic. Weak matches ask the learner to name a topic instead of fabricating an answer. Responses cite their sources, display examples as text, suggest practice and link to the exact lesson. Those links preserve the existing matched-course access checks and do not alter enrollment or progress.

## Language, privacy and availability

English, Nigerian Pidgin, Yorùbá, Hausa, Igbo and French are available through the language selector. Earlier replies retain their original language when the learner switches. Conversation history is held in memory, capped at twenty exchanges and cleared by reloading or using Clear conversation. Questions are not sent to external services or saved to an account.

Previously cached materials work offline through the existing service worker. Unavailable catalogs show an error and retry control. The assistant cannot assess work, send mentor requests, report live mentor availability or replace personal feedback; mentor links remain available for further guidance.

## Verification

Retrieval tests cover all six catalogs, 100 lesson IDs per language, localized navigation prompts, accent normalization, unknown questions, course filtering, examples and source links. Browser tests cover desktop/mobile conversation, French language switching, keyboard accessibility, load failure/retry, matched-course source navigation and offline use. The production build and lint are also checked.

The three-run Lighthouse check measured median LCP of 2.48s for the assistant and 2.39s for sign-in under the configured 4G/CPU throttling. Both scored 100 for accessibility and stayed within the 200 KiB script transfer budget (196,374 and 204,775 bytes respectively). These measurements precede the small final changes to course-specific starter prompts and indexing practice/example text.

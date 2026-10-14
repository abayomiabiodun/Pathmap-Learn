# Course-based learning assistant

Open `/assistant`, use the floating Learning assistant link or select it in the hamburger menu. No AI account or key is required. The assistant retrieves published LMS material rather than generating unrestricted answers.

## Knowledge and conversation

The selected language's `/lessons/{locale}.json` supplies all 100 lessons across ten courses. The assistant indexes titles, explanations, practice tasks and examples, and adds eighteen translated guides covering assessment, chosen paths, tasters, learning, library, streaks, circles, check-ins, mentors, mentoring, showcase, recruiters, accounts, privacy, preferences, offline use, path exploration and the assistant itself. Changes to the lesson catalogs are picked up on the next load; guide copy lives in the message catalogs.

Questions match normalized words with accent-insensitive lookup and extra weight for titles and uncommon concepts. A course filter defaults to the learner's assessed or selected path; platform guidance remains available. Follow-up requests for examples retain the previous topic. Weak matches ask the learner to name a topic instead of fabricating an answer. Responses cite their sources, display examples as text, suggest practice and link to the exact lesson. Those links preserve the existing matched-course access checks and do not alter enrollment or progress.

## Language, privacy and availability

English, Nigerian Pidgin, Yorùbá, Hausa, Igbo and French are available through the language selector. Earlier replies retain their original language when the learner switches. Conversation history is held in memory, capped at twenty exchanges and cleared by reloading or using Clear conversation. Course retrieval stays on the device and chat history is not saved to an account. Optional browser speech can process audio or spoken text through the browser provider; its disclosure appears beside the microphone.

## Voice input and read-aloud

Speak my question starts a single dictation session using the chosen language tag (`en-NG`, `pcm-NG`, `yo-NG`, `ha-NG`, `ig-NG`, `fr-FR`). Dictation appends to the draft, shows interim words and requires review and manual submission. Recording ends through the stop control, browser events or a 45-second limit. Clearing, changing language or leaving the page aborts recording. Dictation and playback do not start automatically.

Each answer has a read-aloud/stop control. Playback reads the reply's original language, explanations and practice, splits long text into short utterances and cancels other playback. Voice matching accepts the same language only; it never substitutes English for Pidgin, Yorùbá, Hausa or Igbo. Changing language, clearing answers or leaving stops playback. Reading is disabled while dictating.

Actual recognition and voice availability depend on the browser/device and installed languages. Unsupported APIs, missing voices, denied permission and speech failures have translated messages; typing remains available. Speech can require an internet connection even when cached course help works offline. There is no cloud speech account configured. See the [Web Speech API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API).

Previously cached materials work offline through the existing service worker. Unavailable catalogs show an error and retry control. The assistant cannot assess work, send mentor requests, report live mentor availability or replace personal feedback; mentor links remain available for further guidance.

## Verification

Retrieval tests cover all six catalogs, 100 lesson IDs per language, localized navigation prompts, accent normalization, unknown questions, course filtering, examples and source links. Browser tests cover desktop/mobile conversation, French language switching, keyboard accessibility, load failure/retry, matched-course source navigation and offline use. The production build and lint are also checked.

Voice browser tests simulate recognition and speech APIs to verify all six language tags and interactions without recording a person. Tests cover missing APIs, denied microphone permission, draft preservation, explicit submission, playback cancellation and missing-language feedback. Installed voice quality and real microphone audio require checking on the learner's device.

The voice-enabled assistant passed the three-run Lighthouse assertions: median LCP 2.18s, accessibility 100 and script transfer 197,763 bytes, using the configured 4G/CPU throttling. The full unit suite passed 144 tests and the coverage thresholds; all pure libraries had 100% coverage. Desktop/mobile browser checks passed for both normal assistant use and simulated speech controls.

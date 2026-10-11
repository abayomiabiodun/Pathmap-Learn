# Feature navigation

The shared header includes a hamburger menu on every page, linking to the path quizzes, taster, continued learning, library, paths, streak, study circles, check-in, mentor pages, showcase, recruiter dashboard, sign-in and privacy.

The native auto popover closes through its close button, Escape, an outside click or selecting a link. Keyboard focus returns to the toggle after Escape. The panel scrolls on small screens while its close button remains visible. Labels follow the selected language across all six supported languages. The existing main navigation now sends Continue learning to `/learn`.

Navigation links render when the menu first opens, and static icon artwork comes from the server layout to limit initial client work. The service worker shell cache is version 21.

Validation includes foundation and translation unit tests, production compilation, lint and browser tests for desktop/mobile keyboard controls, accessibility, translated navigation, all destinations and 320px/900px layouts.

Final Lighthouse runs report accessibility 100 and script transfers within 200 KiB for home and sign-in. Sign-in meets the 2.5s median LCP target. Home remains above that target at 2.96s (three runs: 3.75s, 2.96s, 2.88s), so the performance assertion is not fully passing.

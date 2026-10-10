# Phase 1: foundation

## Delivered

Next.js App Router, strict TypeScript, Tailwind, a shadcn-style Radix button, Lucide icons, Zod validation, React Hook Form auth, next-intl language selection with English fallback, persistent Lite/dark settings, responsive navigation, inline SVG journey artwork, friendly error/loading/offline pages, an installable PWA manifest and offline public-shell caching. Query and reduced-motion providers are scoped to future learning routes so public pages do not download them unnecessarily.

Email/password, magic link and Google OAuth use Supabase when configured. Without credentials, the UI reports configuration requirements and offers the local path catalog. It never creates fictitious accounts or sends mock messages as real ones.

Self-hosted variable fonts use Latin and Latin Extended subsets, swap rendering, preloads, included font licenses and offline caching. Regenerate fonts with `node scripts/fonts.mjs`; regenerate PNG icons with `node scripts/icons.mjs` after installing Playwright Chromium.

## Verified locally

- ESLint with zero warnings; strict TypeScript.
- 21 Vitest/React Testing Library tests, with mock authentication providers and MSW test infrastructure.
- Coverage: 100% statements/lines, 99.09% branches, 88.88% functions across the foundation components and pure modules. Pure modules have 100% coverage. The Supabase transport adapter is excluded from unit instrumentation; provider behavior is mocked in component tests.
- Production build succeeds.
- 18 Playwright checks across desktop and 360px mobile, including axe, dark mode, language, auth validation, persistence, responsive overflow and interactive offline reload. Account responses never enter the service-worker cache.
- Lighthouse: three directly throttled mobile 4G runs per page. Home median LCP 2.35s; auth median 1.93s. Script transfer: 193,292 bytes home, 203,957 bytes auth. Accessibility 100 on both pages.

The default Lighthouse simulated slow-4G model reported approximately 2.9s LCP before the final documented direct-throttle audit; that stricter simulated profile is not claimed as passing. The CI profile and budgets are explicit in `lighthouserc.cjs`. No remote CI run is claimed.

## Continue after Windows restarts

Docker Desktop and WSL installation succeeded. Firmware virtualization is enabled. The Windows virtualization feature requires a pending restart before WSL2 and Docker can run. Do not substitute mocked database results for the required RLS tests.

1. Restart Windows and open Docker Desktop; complete any first-run setup.
2. Confirm `docker version` includes a working server.
3. Start Phase 2: install the Supabase CLI as a project dependency, initialize its local config, implement the schema/RLS migrations and data seeds, then run clean migration and database policy tests.
4. Run all existing application checks as well. Commit Phase 2 only after every applicable gate passes.
5. Continue the requested remaining phases in order.

## Foundation demo

1. Open the home page at desktop and phone widths.
2. Switch to French or Nigerian Pidgin, then enable Lite mode and refresh to demonstrate persistence.
3. Explore all ten path descriptions.
4. Open sign-in, submit an invalid email, then demonstrate the configuration notice without provider keys.
5. With the installed service worker ready, disconnect and reload home to show the offline notice and working controls.

Quiz and other learning navigation items are scaffolding for later phases, not completed product flows.

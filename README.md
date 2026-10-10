# PathMap Learn

A low-data learning companion for tech and non-tech beginners.

## Setup

Use Node.js 22+ and pnpm 11.25.0. Run `pnpm install`, copy `.env.example` to `.env.local`, then run **`pnpm dev`**. Visit http://localhost:3000.

Without Supabase keys the app explicitly offers a local demo. It never pretends to create accounts or send emails.

On this Windows computer, Node and pnpm are available through the Codex bundled runtime rather than the system PATH. After dependency installation, `powershell -ExecutionPolicy Bypass -File scripts/dev.ps1` starts the app in one command using that runtime, without changing system PATH or PowerShell policy permanently.

## Foundation architecture

- `src/app`: Next.js App Router pages, layouts and auth callback.
- `src/components`: responsive UI, shadcn-style Radix Button, providers, auth form.
- `src/lib`: pure validated preferences, redirect protection, Supabase adapter.
- `messages`: complete UI catalogs for English, Nigerian Pidgin, Yoruba, Hausa, Igbo and French; additional language packs load on demand.
- `public`: installable PWA manifest, inline SVG icons and public-shell service worker.
- `tests`: Vitest/RTL, MSW mocks, Playwright desktop and 360px mobile, axe WCAG checks.

## Checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db`, `pnpm exec playwright install chromium`, `pnpm build`, `pnpm test:e2e`. Run `pnpm check` for all gates in order, stopping on the first failure.

Unit coverage is enforced at 80% overall and 90% on pure `src/lib` modules. GitHub Actions runs the same checks plus Lighthouse budgets against production pages.

Lighthouse uses direct DevTools throttling: 1,638Kbps download, 750Kbps upload, 150ms request latency and 4× CPU slowdown, with three runs per page. Median LCP must be ≤2,500ms and median script transfer ≤204,800 bytes. Accessibility must score 100. Reports stay local in `.lighthouseci/reports`; they are not uploaded publicly. The default Lighthouse simulated slow-4G model remains a separate, tougher optimization target for Phase 8.

## Configure before production

- Create Supabase project; set URL and public anonymous key in `.env.local` and Vercel environment variables.
- Enable email/password and magic-link authentication. Configure SMTP, email confirmation and rate limits.
- Enable Google provider with your Google OAuth client credentials **in Supabase only**.
- Add `http://localhost:3000/auth/callback` and the deployed `/auth/callback` URL to Supabase redirect allowlist.
- Set `NEXT_PUBLIC_APP_URL` to your deployment URL.
- Set up later database migrations, notification provider secrets, scheduled jobs and real resource verification before treating the complete product as production ready.
- Have native speakers review translated UI before launch.

## Design and accessibility

Deep green and amber on warm neutral surfaces, self-hosted Latin and Latin Extended Manrope display and DM Sans body with swap loading, CSS design tokens and dark mode. Fonts are cached with the public shell for offline use. Controls meet 44px tap targets; skip navigation, visible focus, labels, reduced-motion support and Lite mode are built into the shell.

Service worker caches only explicitly public pages and static assets, never account pages or API responses. Production HTTPS is required for installation. Both SVG and 192px/512px PNG icons are included; `node scripts/icons.mjs` regenerates PNG variants from the SVG with Playwright.

## Status

Phase 1 foundation, the local quiz flow, a starter learning space, learning commitment dashboards, and study circles with mentor guidance are implemented. See [validation and continuation notes](docs/phase-1.md), [quiz scoring and storage](docs/quiz.md), [learning content and progress](docs/learning.md), [streaks and recruiter access](docs/engagement.md), and [circles and mentors](docs/community.md). Known-path confirmation and quiz recommendations lead into real lessons. The library lists ten starter courses: three Web Development lessons and one introductory lesson for each other path, with practice and knowledge checks in all six languages. The learning dashboard records device streaks, weekly goals and points immediately. Supabase migrations and adapters implement an opt-in top-ten board, approved recruiter searches, learner-controlled opportunity requests, twelve-person study circles, message reports, approved mentors, private guidance conversations and learner-confirmed check-ins. Shared account features require database configuration; no fake live learners or mentors are displayed. Full career curricula, games, notifications, the admin console and full database integration remain unfinished.

Docker Desktop and WSL were installed for Phase 2. Windows Virtual Machine Platform was enabled, but Windows reports a pending restart and the Docker engine cannot start yet. Restart Windows and open Docker Desktop to continue the local Supabase setup. The engagement migration and real RLS tests pass in an isolated PGlite PostgreSQL database; full Supabase Auth/PostgREST integration is still pending. No database phase has been marked complete.

CI is configured; remote GitHub Actions and Vercel deployment have not run. For deployment, import this repository into Vercel as a Next.js project, set the public environment variables listed above, and configure Supabase redirect URLs. Complete the remaining phases and database gates before launching the full product.

# Learning commitment and recruiter access

`/dashboard` shows real device progress, daily streaks, learning points, a rolling seven-day goal ring, a shared top-ten board, visibility choices, and incoming opportunity requests. Home and the learning area link to it. `/recruiter` provides approval requests, candidate filters, opportunity requests, and accepted replies. Connection failures provide a retry control and prevent a device-only save from being mistaken for withdrawing server visibility.

All new copy is provided in English, Nigerian Pidgin, Yoruba, Hausa, Igbo, and French. `scripts/create-engagement-content.mjs` is the authoring source for these messages.

## Recording progress

Complete a practice with at least 20 characters and answer the lesson check correctly. The existing version-one device progress format now accepts optional activity events, preserving old drafts and completions. Old completions without dated events do not invent historical streaks. Repeating a lesson on the same day does not inflate daily activity; practising it on a new day can continue a streak.

Calendar days use Africa/Lagos (UTC+1) on both device and server. A streak allows one missed calendar day, which adds neither a learning day nor points. A second missed day breaks that run. The current streak may start again from a more recent continuous run. The best streak counts actual learning days. The goal measures the last seven days; ranking measures the last thirty. A completed lesson earns 100 points once, and each distinct learning day earns 25 points.

Device records are editable by their owner and are not shared as verified history. When Supabase is configured and the learner is signed in, completing a practice also submits its lesson, practice, and answer to a server RPC. The server validates the catalog check and practice length, derives the learner from the authenticated session, and assigns its own date. No client date, points, identity, or completion total is accepted. Failed/offline submissions leave device progress intact; repeat the practice online to record a server event. Historical offline dates are not backdated or automatically imported. The online totals are shown separately on the dashboard.

These checks record submitted practice and consistency, not professional assessment or certification. Candidate starting levels are self-reported. The starter courses remain introductory, rather than full career curricula.

## Consent and recruiter permissions

Public ranking and recruiter visibility both default to off. Save each choice to publish it to a connected account. Without a configured account, saving affects only this device and is explicitly labelled unpublished. Public records expose nickname, chosen path, and learning totals. Recruiter profiles additionally expose the learner-selected starting level, language, optional city/region, and opportunity preference. Email and private practice are never returned by ranking or candidate RPCs.

Only learners active in the last seven days appear. Ranking sorts by thirty-day learning days, then completed lessons, then points, with a stable account-ID tie break and a ten-record limit. Approved recruiters can filter active opted-in learners by path, language, starting level, location, and internship/job preference; results are capped at 50. No demonstration people are presented as live records.

Recruiters submit an organisation name and wait for administrator approval. An authenticated client cannot set its approval flag or change an approved organisation name. After independent organisation verification, a trusted administrator can approve a specific account through the Supabase SQL editor:

```sql
update public.recruiter_accounts
set approved = true
where id = 'THE_VERIFIED_AUTH_USER_UUID';
```

Opportunity requests stay inside the app; no email or external message is sent. A pending pair cannot be duplicated, and a recruiter can create at most ten requests per rolling 24 hours. The learner can accept or decline once and optionally include a reply. Approved recruiters can read replies only while that learner remains opted in. Turning visibility off and saving removes candidate access and access to existing requests/replies; the learner retains their inbox history. Turning public ranking off removes the public row independently.

## Database setup and tests

The migration is `supabase/migrations/20261010000100_engagement.sql`. Apply it to a clean Supabase database with the standard `auth.users`, `auth.uid()`, `anon`, and `authenticated` roles. Set the public URL and anonymous key from `.env.example`, configure auth providers and redirect URLs, and rebuild the app. Never put a service-role key in the browser environment. The approved recruiter dashboard requires real authenticated users and recorded activity.

`pnpm test:db` runs the migration in a fresh embedded PostgreSQL database (PGlite), with isolated fixture roles/auth users. It tests real row-level security, direct-write denial, server dates, repeat-event deduplication, catalog answer agreement, opt-in ranking, private practice isolation, approval protection, candidate filters, consent withdrawal, contact ownership, acceptance, and request limits. This is included in `pnpm check` and CI. Fixtures exist only in the isolated test database.

This SQL gate does not replace a live Supabase Auth/PostgREST integration test. Docker Desktop on this computer still requires the pending Windows restart before the requested local Supabase setup can run. No live database keys are configured, so shared rankings and recruiter access currently show their disconnected state. The full original database phase is still pending.

The service worker serves the installed public dashboard shell from cache first, avoiding a network-revalidation race when connectivity drops during a reload. Public document matching ignores Next's navigation-header variations; RSC responses are never cached. It excludes recruiter pages, auth, APIs, and cross-origin Supabase responses. Account data is fetched at runtime and is never embedded in cached HTML. Recruiter access requires an online connection.

## Validation

The final `pnpm check` passed lint, TypeScript, 69 unit/component tests, the clean PostgreSQL migration and RLS gate, the production build, and 48 desktop/mobile browser tests. Line coverage is 99.15%; the learning and engagement calculation modules have 100% coverage. Browser checks cover six-language controls, practice completion, persisted goals, offline dashboard navigation, accessibility, and recruiter gating. Connected UI behavior is covered with isolated mocked accounts; live Supabase Auth/PostgREST verification remains pending the local database setup described above.

Production Lighthouse checks passed across eight routes in two batches, with three runs per route, 4G network throttling and 4× CPU slowdown: home, auth, quiz, known-path selection, library, web lessons, learner dashboard, and recruiter dashboard. Each route passed accessibility 100, median LCP at most 2.5 seconds, and the 200 KB JavaScript budget. Service-worker installation begins after page load during idle time, and offscreen home/dashboard sections defer rendering. The final auth rebuild disables unnecessary privacy-page prefetching; navigation remains available. These measurements use the currently unconfigured account state. Connected Supabase SDK loading and live account performance still need verification after setup.

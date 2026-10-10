# Study circles and mentor guidance

Visit `/circles` from Community in the main navigation, a lesson, the learning dashboard, or the home-page link. Both the study board and mentor guidance are translated into all six UI languages.

## Learner circles

Joining is explicit. Nickname, chosen path, starting level and learning language are validated; the server matches these last three fields to a circle with at most 12 members. A learner belongs to one circle at a time. Transaction locks protect concurrent capacity checks and membership changes. This consent is independent of public leaderboard and recruiter visibility. Members see nicknames and plain-text messages, never email, practice drafts or other account fields.

The board supports questions, small wins, one-level replies, and a weekly check-in prompt. A learner can remove their own post or reply. Leaving or changing circles hides their old messages; it does not publish a new message automatically. Recent board content is bounded. Plain text is rendered through React without HTML injection or active links. Posting is limited to 20 messages per hour, including removed messages, so leaving/rejoining cannot reset the limit.

Reports have spam, abuse or unsafe-content reasons. Reporting hides that message for the reporter immediately after the server accepts the report and puts it in a private moderation queue. One learner's report does not automatically censor a message for everyone. Raw posts have no direct client SELECT grant; only the redacting member-only RPC returns board content. Reports are readable only by their reporter or a trusted database administrator.

## Mentors and private guidance

Mentor applicants join a circle and provide a 20–500-character description of their experience. Administrator approval is required. Clients cannot grant approval, edit approved expertise, or read another applicant's private record. The directory shows at most 30 approved mentors matching a learner's path and language. The server checks the match again when accepting a guidance request.

Requests and replies are private to the learner and their assigned, currently approved mentor. There is one open conversation per learner/mentor pair, at most three open requests per learner, and five new requests per 24 hours. Messages are limited to 20 per sender per hour. Either participant can close a conversation; closed conversations are read-only.

An assigned mentor can propose a future session within 90 days. The learner must confirm it; only then does it become scheduled. Device-local date entry is converted to UTC, stored as `timestamptz`, and shown in Lagos time. Sessions use the existing message space, with manual Refresh for updates. No video call, reminder, email, external message, or promise of an immediate response is generated. Revoking approval removes the mentor's access; the learner retains their conversation history. Leaving a circle withdraws mentor approval and peer-board access, but preserves private conversations as a learner.

Question and board drafts save only on the device while typing; they are submitted only by the relevant send button. Errors retain draft text. Shared records and private conversations are not cached by the service worker. Avoid putting sensitive information in drafts on a shared device.

## Database and moderation setup

Withdrawing mentor participation is recorded separately from a pending application. A stale approval cannot restore that participation; the person must rejoin and explicitly reapply for a new review. Approval revocation or withdrawal closes open mentor conversations and cancels their session proposals, while preserving learner-readable messages. This releases learners' open-request slots so they can ask another mentor.

Apply `supabase/migrations/20261010000100_engagement.sql`, then `supabase/migrations/20261010000200_community.sql` to Supabase and configure the public URL/key and Auth redirects. All eight new tables use RLS, and mutations use authenticated RPCs with server-derived identity and a fixed search path. Existing leaderboard/recruiter consent remains independent.

A trusted administrator must independently review mentor experience and moderate reports through the Supabase SQL editor. A full admin console is still a later product phase. Example operations, with verified UUIDs:

```sql
-- Approve a reviewed mentor; set false to revoke access.
update public.study_mentors set approved = true
where id = 'REVIEWED_AUTH_USER_UUID' and not withdrawn;

-- Review unresolved reports using administrator access.
select r.post, r.reason, p.body, r.created_at
from public.study_circle_reports r
join public.study_circle_posts p on p.id = r.post
where not r.resolved order by r.created_at;

-- Hide a reviewed message for everyone, then mark its reports resolved.
update public.study_circle_posts set moderated = true where id = 'REVIEWED_POST_UUID';
update public.study_circle_reports set resolved = true where post = 'REVIEWED_POST_UUID';
```

The current computer has no configured Supabase keys. Local Docker/Supabase setup and live Auth/PostgREST verification remain pending. Unconfigured screens explain this and permit only a local question draft; no fictional peers or mentors are shown. `pnpm test:db` applies both migrations to fresh isolated PostgreSQL databases and tests actual RLS, matching/capacity, private access, reports, approved mentors, session confirmation, revocation, and rate limits. It does not substitute for live Supabase integration.

## Validation

Lint, TypeScript, the production build, formatting, 85 unit/component tests and both clean PostgreSQL/RLS gates passed. Pure community validation has 100% coverage. All 52 desktop/mobile browser scenarios passed across the full run and a focused rerun of the corrected mobile theme test. They cover six-language controls, light/dark accessibility, 360px layouts, question-draft persistence, account gating, navigation and exclusion of private pages from offline caches. Connected UI flows use isolated mocked accounts; actual SQL permissions and transitions are tested against fresh PostgreSQL.

The production Lighthouse audit passed all nine routes with three runs per route, 4G throttling and 4× CPU slowdown. The community page's median LCP was 1.713 seconds, accessibility was 100, and script transfer was 197,493 bytes, within the 200 KB budget. These measurements use the current unconfigured account state; live Supabase Auth/PostgREST and connected-data performance still need verification after setup.

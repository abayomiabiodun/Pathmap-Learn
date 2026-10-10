# Learner showcase

Open `/circles` and choose **Learning showcase**. Members can share learning updates, summaries and projects with their matched study circle. Publishing needs explicit consent, separate from ranking and recruiter visibility. One optional picture and one HTTPS project link can accompany each post. Colleagues can like once, unlike, comment, report content, and remove their own work.

Text drafts remain on the device. Pictures remain in the current page until publishing; JPEG, PNG and WebP files up to 5 MB are converted to JPEG at a maximum of 960 pixels, with metadata removed. The database accepts at most 256 KiB per picture and rejects metadata markers. Pictures load only when requested and only for current circle members. The private feed is excluded from service-worker caching. Leaving the circle removes the learner’s posts and comments and clears their picture bytes and likes.

Apply `20261010000300_showcase.sql` after the engagement and community migrations. No Storage bucket is required: bounded JPEG bytes are private database rows, served by an authorized RPC. This is appropriate for the initial small-circle feature; larger deployments can migrate media to private object storage. Posts are limited to five per learner per day and comments to twenty per hour. The feed shows the latest twenty posts and each post’s latest thirty comments. Likes and comments do not create learning streak credit.

Administrators review `circle_work_reports` using trusted database access. Set `circle_work.moderated` or `circle_work_comments.moderated` to hide unsafe content for everyone; reports hide content immediately for the reporter. Client roles cannot approve moderation or read other learners’ reports.

The current local installation has no connected Supabase environment. Draft composition and picture preparation work, while shared posting remains gated. Clean migration and role isolation checks run in PGlite; actual Supabase Auth/PostgREST verification still requires finishing the existing local Supabase setup.

import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const text = 'I am learning headings and need help with semantic structure.';
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const fails = (sql, params = []) => assert.rejects(db.query(sql, params));
async function as(n, role = 'authenticated') {
  await db.exec(`reset role; set role ${role};`);
  await query("select set_config('request.jwt.claim.sub',$1,false)", [n ? uid(n) : '']);
}
async function join(n, path = 'web', level = 'new', language = 'en') {
  await as(n);
  await query('select public.join_study_circle($1,$2,$3,$4)', [
    `Learner ${n}`,
    path,
    level,
    language,
  ]);
}
const state = async () => (await query('select public.my_study_circle() as state'))[0].state;
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(readFileSync('supabase/migrations/20261010000100_engagement.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261010000200_community.sql', 'utf8'));
  assert.equal(
    (
      await query(
        "select count(*)::int as n from pg_class where relname in ('community_profiles','study_circles','study_circle_members','study_circle_posts','study_circle_reports','study_mentors','mentor_guidance','mentor_messages') and relrowsecurity",
      )
    )[0].n,
    8,
  );
  for (let n = 1; n <= 30; n++) await query('insert into auth.users values($1)', [uid(n)]);
  await as(0, 'anon');
  await fails('select public.my_study_circle()');
  await fails('select * from public.study_circle_posts');
  await fails('select public.join_study_circle($1,$2,$3,$4)', ['Anon', 'web', 'new', 'en']);
  for (let n = 1; n <= 13; n++) await join(n);
  const second = (await state()).circle.id;
  await as(1);
  const first = (await state()).circle.id;
  assert.notEqual(first, second);
  assert.equal((await state()).circle.members, 12);
  await join(14, 'web', 'basics');
  assert.notEqual((await state()).circle.id, first);
  await join(15, 'web', 'new', 'fr');
  assert.notEqual((await state()).circle.id, first);
  await join(16, 'data');
  assert.notEqual((await state()).circle.id, first);
  await join(17);
  await join(18);
  await join(19, 'data');
  await join(20);
  await join(21);
  await join(22);
  await as(1);
  assert.equal((await query('select * from public.community_profiles')).length, 1);
  await fails('update public.community_profiles set nickname=$1 where id=$2', [
    'Other person',
    uid(2),
  ]);
  await fails('insert into public.study_circle_members values($1,$2)', [uid(30), first]);
  await fails('select public.join_study_circle($1,$2,$3,$4)', ['x', 'web', 'new', 'en']);
  await fails('select public.join_study_circle($1,$2,$3,$4)', ['Valid', 'invalid', 'new', 'en']);
  await query('select public.post_circle_message($1,$2)', [text, null]);
  let root = (await state()).posts[0].id;
  await fails('select public.post_circle_message($1,$2)', ['\n\t'.repeat(20), null]);
  await fails('select public.post_circle_message($1,$2)', ['x'.repeat(2001), null]);
  await as(2);
  await query('select public.post_circle_message($1,$2)', [
    'Here is a useful explanation of semantic HTML.',
    root,
  ]);
  let reply = (await state()).posts.find((p) => p.parent === root).id;
  await fails('select public.post_circle_message($1,$2)', [text, reply]);
  await fails('select public.remove_circle_message($1)', [root]);
  await as(13);
  assert.deepEqual((await state()).posts, []);
  await fails('select public.post_circle_message($1,$2)', [text, root]);
  await fails('select public.report_circle_message($1,$2)', [root, 'spam']);
  await as(2);
  await query('select public.report_circle_message($1,$2)', [root, 'spam']);
  assert.equal((await state()).posts.find((p) => p.id === root).body, '');
  await as(3);
  assert.equal((await query('select * from public.study_circle_reports')).length, 0);
  assert.equal((await state()).posts.find((p) => p.id === root).body, text);
  await fails('select * from public.study_circle_posts');
  await as(1);
  await query('select public.remove_circle_message($1)', [root]);
  assert.equal((await state()).posts.find((p) => p.id === root).removed, true);
  await query('select public.post_circle_message($1,$2)', [
    '<script>alert("safe plain text")</script>',
    null,
  ]);
  root = (await state()).posts.find((p) => !p.removed && !p.parent).id;
  await as(0, 'postgres');
  await query('update public.study_circle_posts set moderated=true where id=$1', [root]);
  await as(3);
  assert.equal((await state()).posts.find((p) => p.id === root).body, '');
  await as(4);
  for (let i = 0; i < 20; i++)
    await query('select public.post_circle_message($1,$2)', [text, null]);
  await fails('select public.post_circle_message($1,$2)', [text, null]);
  await query('select public.leave_study_circle()');
  await join(4);
  await fails('select public.post_circle_message($1,$2)', [text, null]);
  await as(17);
  await query('select public.apply_study_mentor($1)', [
    'I help beginners build accessible HTML and CSS pages.',
  ]);
  assert.equal((await state()).mentor.approved, false);
  await fails('update public.study_mentors set approved=true');
  await as(1);
  assert.deepEqual(await query('select * from public.study_mentors($1,$2)', ['web', 'en']), []);
  await fails('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  await as(0, 'postgres');
  await query('update public.study_mentors set approved=true where id=$1', [uid(17)]);
  await as(1);
  const directory = await query('select * from public.study_mentors($1,$2)', ['web', 'en']);
  assert.equal(directory.length, 1);
  assert.deepEqual(Object.keys(directory[0]).sort(), ['bio', 'id', 'language', 'nickname', 'path']);
  await as(15);
  await fails('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  await as(17);
  await fails('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  await fails('select public.join_study_circle($1,$2,$3,$4)', ['Mentor', 'data', 'new', 'en']);
  await as(1);
  await query('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  let request = (await state()).guidance[0].id;
  await fails('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  await as(2);
  assert.deepEqual((await state()).guidance, []);
  assert.equal((await query('select * from public.mentor_guidance')).length, 0);
  await fails('select public.send_mentor_message($1,$2)', [request, text]);
  await fails('select public.confirm_mentor_session($1)', [request]);
  await as(17);
  assert.equal((await state()).guidance[0].mentor_side, true);
  await query('select public.send_mentor_message($1,$2)', [
    request,
    'Start with a heading that describes your page.',
  ]);
  assert.equal((await state()).guidance[0].status, 'answered');
  await fails('select public.propose_mentor_session($1,$2)', [
    request,
    new Date(Date.now() - 86400000).toISOString(),
  ]);
  await fails('select public.propose_mentor_session($1,$2)', [
    request,
    new Date(Date.now() + 91 * 86400000).toISOString(),
  ]);
  const date = new Date(Date.now() + 86400000).toISOString();
  await query('select public.propose_mentor_session($1,$2)', [request, date]);
  assert.equal((await state()).guidance[0].status, 'proposed');
  await fails('select public.confirm_mentor_session($1)', [request]);
  await as(1);
  await fails('select public.propose_mentor_session($1,$2)', [request, date]);
  await query('select public.confirm_mentor_session($1)', [request]);
  assert.equal((await state()).guidance[0].status, 'scheduled');
  await query('select public.send_mentor_message($1,$2)', [
    request,
    'Thank you, how should I describe my navigation links?',
  ]);
  await as(2);
  assert.equal((await query('select * from public.mentor_messages')).length, 0);
  await as(0, 'postgres');
  await query('update public.study_mentors set approved=false where id=$1', [uid(17)]);
  await as(17);
  assert.equal((await query('select * from public.mentor_guidance')).length, 0);
  await fails('select public.send_mentor_message($1,$2)', [request, text]);
  await as(1);
  assert.equal((await state()).guidance[0].status, 'closed');
  assert.equal((await state()).guidance[0].session_at, null);
  await fails('select public.close_mentor_guidance($1)', [request]);
  await fails('select public.send_mentor_message($1,$2)', [request, text]);
  await as(0, 'postgres');
  await query('update public.study_mentors set approved=true where id=$1', [uid(17)]);
  for (const n of [20, 21, 22]) {
    await as(n);
    await query('select public.apply_study_mentor($1)', [
      'I teach accessible beginner projects with practical examples.',
    ]);
    await as(0, 'postgres');
    await query('update public.study_mentors set approved=true where id=$1', [uid(n)]);
  }
  await as(5);
  for (const n of [17, 20, 21])
    await query('select public.request_mentor_guidance($1,$2)', [uid(n), text]);
  await fails('select public.request_mentor_guidance($1,$2)', [uid(22), text]);
  await as(6);
  for (let i = 0; i < 5; i++) {
    await query('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
    const id = (await state()).guidance.find((g) => g.status !== 'closed').id;
    await query('select public.close_mentor_guidance($1)', [id]);
  }
  await fails('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  await as(5);
  request = (await state()).guidance[0].id;
  for (let i = 0; i < 20; i++)
    await query('select public.send_mentor_message($1,$2)', [request, text]);
  await fails('select public.send_mentor_message($1,$2)', [request, text]);
  await as(17);
  await query('select public.leave_study_circle()');
  assert.equal((await state()).circle, null);
  assert.equal((await state()).mentor, null);
  assert.deepEqual((await state()).guidance, []);
  await as(0, 'postgres');
  await query('update public.study_mentors set approved=true where id=$1', [uid(17)]);
  await as(17);
  assert.deepEqual((await state()).guidance, []);
  await as(3);
  assert.ok(
    !(await query('select * from public.study_mentors($1,$2)', ['web', 'en'])).some(
      (mentor) => mentor.id === uid(17),
    ),
  );
  await fails('select public.request_mentor_guidance($1,$2)', [uid(17), text]);
  await join(17);
  await query('select public.apply_study_mentor($1)', [
    'I help learners practise accessible pages and meaningful links.',
  ]);
  assert.equal((await state()).mentor.approved, false);
  await as(1);
  await query('select public.leave_study_circle()');
  assert.equal((await state()).circle, null);
  assert.deepEqual((await state()).posts, []);
  assert.equal((await state()).guidance.length, 1);
  await fails('select public.post_circle_message($1,$2)', [text, null]);
  await fails('select public.request_mentor_guidance($1,$2)', [uid(20), text]);
  await as(0, 'postgres');
  const crowdedRoot = (
    await query(
      "insert into public.study_circle_posts(circle,author,body,created_at) values($1,$2,$3,now()-interval '2 hours') returning id",
      [first, uid(3), text],
    )
  )[0].id;
  await query(
    'insert into public.study_circle_posts(circle,author,parent,body) select $1,$2,$3,$4 from generate_series(1,500)',
    [first, uid(2), crowdedRoot, text],
  );
  await as(3);
  const bounded = (await state()).posts;
  assert.ok(bounded.length <= 300);
  assert.ok(bounded.some((post) => post.id === crowdedRoot));
  assert.ok(
    bounded
      .filter((post) => post.parent)
      .every((post) => bounded.some((root) => root.id === post.parent)),
  );
  console.log(
    'Community migration, circle matching/capacity, private boards, moderation, mentor approval, assigned conversations, confirmed sessions, and rate limits passed.',
  );
} finally {
  await db.close();
}

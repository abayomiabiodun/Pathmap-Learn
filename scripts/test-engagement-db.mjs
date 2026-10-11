import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const practice = 'A heading, a paragraph and a descriptive link.';
async function as(n, role = 'authenticated') {
  await db.exec(`reset role; set role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [n ? uid(n) : '']);
}
async function query(sql, params = []) {
  return (await db.query(sql, params)).rows;
}
async function fails(sql, params = []) {
  await assert.rejects(db.query(sql, params));
}
async function profile(n, publicBoard = true, recruiter = true) {
  await as(n);
  await query('select public.save_learning_profile($1,$2,$3,$4,$5,$6,$7,$8)', [
    `Learner ${n}`,
    'web',
    'new',
    'yo',
    'Lagos',
    'both',
    publicBoard,
    recruiter,
  ]);
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(readFileSync('supabase/migrations/20261010000100_engagement.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261010000200_community.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/20261011000100_ten_lessons.sql', 'utf8'));
  assert.equal(
    (
      await query(
        "select count(*)::int as n from pg_class where relname in ('learning_profiles','lesson_catalog','learning_activity','recruiter_accounts','recruiter_requests') and relrowsecurity",
      )
    )[0].n,
    5,
  );
  for (let n = 1; n <= 16; n++) await query('insert into auth.users values($1)', [uid(n)]);
  for (let n = 1; n <= 13; n++) {
    await profile(n, n !== 13, n !== 13);
    await query('select public.record_learning_activity($1,$2,$3)', ['web/html', practice, true]);
  }
  await as(1);
  await query('select public.save_learning_profile($1,$2,$3,$4,$5,$6,$7,$8)', [
    'Adẹ́ 1',
    'web',
    'new',
    'yo',
    'Lagos',
    'both',
    true,
    true,
  ]);
  await query('select public.record_learning_activity($1,$2,$3)', ['web/html', practice, true]);
  assert.equal((await query('select count(*)::int as n from public.learning_activity'))[0].n, 1);
  assert.equal(
    (
      await query(
        "select (day=(current_timestamp at time zone 'Africa/Lagos')::date) as server_date from public.learning_activity",
      )
    )[0].server_date,
    true,
  );
  await fails('select public.record_learning_activity($1,$2,$3)', ['web/html', practice, false]);
  await fails('select public.record_learning_activity($1,$2,$3)', ['web/not-real', practice, true]);
  await fails('select public.record_learning_activity($1,$2,$3)', ['web/css', 'short', false]);
  await fails('select public.record_learning_activity($1,$2,$3)', [
    'web/css',
    '\n\t'.repeat(20),
    false,
  ]);
  await fails('select public.record_learning_activity($1,$2,$3)', [
    'web/css',
    'x'.repeat(10001),
    false,
  ]);
  await fails(
    'insert into public.learning_activity(learner,lesson,practice,day) values($1,$2,$3,$4)',
    [uid(1), 'web/html', practice, '2020-01-01'],
  );
  await fails('update public.learning_profiles set id=$1', [uid(2)]);
  assert.equal((await query('select * from public.learning_profiles')).length, 1);
  assert.equal(
    (await query('select * from public.learning_activity where learner=$1', [uid(2)])).length,
    0,
  );
  await fails('select public.learner_stats($1)', [uid(2)]);
  let account = (await query('select public.my_learning_account() as account'))[0].account;
  assert.equal(account.stats.xp, 125);
  assert.equal(account.stats.completed, 1);
  assert.equal(account.stats.streak, 1);
  assert.equal(account.profile.nickname, 'Adẹ́ 1');
  await as(0, 'anon');
  const board = await query('select * from public.top_learners()');
  assert.equal(board.length, 10);
  assert.equal(board[0].id, uid(1));
  assert.deepEqual(Object.keys(board[0]).sort(), [
    'active_days',
    'completed',
    'id',
    'last_active',
    'nickname',
    'path',
    'streak',
    'xp',
  ]);
  for (const table of [
    'learning_profiles',
    'learning_activity',
    'recruiter_accounts',
    'recruiter_requests',
    'lesson_catalog',
  ])
    await fails(`select * from public.${table}`);
  await fails('select public.my_learning_account()');
  await fails('select public.recruiter_learners()');
  await as(14);
  await query('select public.apply_recruiter($1)', ['Example employer']);
  await fails('update public.recruiter_accounts set approved=true');
  await fails('select public.recruiter_learners()');
  await fails('select public.request_learner_contact($1,$2)', [
    uid(1),
    'A paid internship in web development.',
  ]);
  await as(0, 'postgres');
  await query('update public.recruiter_accounts set approved=true where id=$1', [uid(14)]);
  // Admin fixture dates exercise SQL streaks, 30-day windows, and ranking.
  await query(
    "insert into public.learning_activity(learner,lesson,day,practice) values($1,'web/html',public.learning_today()-2,$2),($1,'web/html',public.learning_today()-3,$2),($1,'web/css',public.learning_today()-31,$2)",
    [uid(2), practice],
  );
  await query(
    "insert into public.learning_activity(learner,lesson,day,practice) values($1,'web/html',public.learning_today()-3,$2),($1,'web/html',public.learning_today()-5,$2)",
    [uid(3), practice],
  );
  assert.equal((await query('select * from public.learner_stats($1)', [uid(2)]))[0].streak, 3);
  assert.equal((await query('select * from public.learner_stats($1)', [uid(3)]))[0].streak, 1);
  await as(14);
  assert.equal((await query('select * from public.learning_profiles')).length, 0);
  assert.equal((await query('select * from public.learning_activity')).length, 0);
  assert.equal((await query('select * from public.recruiter_learners()')).length, 12);
  assert.equal(
    (await query("select * from public.recruiter_learners('web','yo','new','lag','internship')"))
      .length,
    12,
  );
  assert.equal((await query("select * from public.recruiter_learners('data')")).length, 0);
  assert.equal((await query("select * from public.recruiter_learners('','fr')")).length, 0);
  assert.equal((await query("select * from public.recruiter_learners('','','built')")).length, 0);
  assert.equal(
    (await query("select * from public.recruiter_learners('','','','Abuja')")).length,
    0,
  );
  await fails('select public.request_learner_contact($1,$2)', [
    uid(13),
    'A paid internship in web development.',
  ]);
  await query('select public.request_learner_contact($1,$2)', [
    uid(1),
    'A paid internship in web development.',
  ]);
  await fails('select public.request_learner_contact($1,$2)', [
    uid(1),
    'A second internship request is not allowed while pending.',
  ]);
  let request = (await query('select * from public.recruiter_requests'))[0];
  assert.equal(request.status, 'pending');
  assert.equal(request.reply, '');
  await as(2);
  assert.equal((await query('select * from public.recruiter_requests')).length, 0);
  await fails('select public.respond_learner_contact($1,$2,$3)', [
    request.id,
    true,
    'Forged response',
  ]);
  await as(1);
  await query('select public.respond_learner_contact($1,$2,$3)', [
    request.id,
    true,
    'I would like to discuss this internship.',
  ]);
  await fails('select public.respond_learner_contact($1,$2,$3)', [
    request.id,
    false,
    'Changed response',
  ]);
  await as(14);
  account = (await query('select public.my_learning_account() as account'))[0].account;
  assert.equal(account.sent[0].status, 'accepted');
  assert.equal(account.sent[0].reply, 'I would like to discuss this internship.');
  assert.equal((await query('select * from public.top_learners()'))[0].id, uid(2));
  await profile(1, false, false);
  await as(14);
  assert.equal((await query('select * from public.recruiter_requests')).length, 0);
  assert.equal(
    (await query('select public.my_learning_account() as account'))[0].account.sent.length,
    0,
  );
  assert.ok(!(await query('select * from public.top_learners()')).some((row) => row.id === uid(1)));
  assert.ok(
    !(await query('select * from public.recruiter_learners()')).some((row) => row.id === uid(1)),
  );
  for (let n = 2; n <= 10; n++)
    await query('select public.request_learner_contact($1,$2)', [
      uid(n),
      'A paid internship in web development.',
    ]);
  await fails('select public.request_learner_contact($1,$2)', [
    uid(11),
    'An eleventh request exceeds the daily limit.',
  ]);
  await as(0, 'postgres');
  await query(
    'update public.learning_activity set day=public.learning_today()-8 where learner=$1',
    [uid(12)],
  );
  await as(14);
  await fails('select public.request_learner_contact($1,$2)', [
    uid(12),
    'An inactive learner must not receive a new request.',
  ]);
  assert.ok(
    !(await query('select * from public.recruiter_learners()')).some((row) => row.id === uid(12)),
  );
  // Public catalog answers must match the actual authored lesson checks.
  await as(0, 'postgres');
  const lessons = JSON.parse(readFileSync('public/lessons/en.json', 'utf8'));
  const catalog = await query('select * from public.lesson_catalog');
  assert.equal(catalog.length, 100);
  for (const row of catalog) assert.equal(row.answer, lessons[row.lesson.split('/')[1]].answer);
  // New lessons use the same verified completion and RLS rules as the original lessons.
  await as(1);
  await fails('select public.record_learning_activity($1,$2,$3)', [
    'web/web-project',
    practice,
    false,
  ]);
  await query('select public.record_learning_activity($1,$2,$3)', [
    'web/web-project',
    practice,
    true,
  ]);
  await query('select public.record_learning_activity($1,$2,$3)', [
    'data/data-project',
    practice,
    true,
  ]);
  assert.equal(
    (
      await query(
        "select count(*)::int as n from public.learning_activity where lesson like '%project'",
      )
    )[0].n,
    2,
  );
  await as(2);
  assert.equal(
    (
      await query(
        "select count(*)::int as n from public.learning_activity where lesson like '%project'",
      )
    )[0].n,
    0,
  );
  console.log(
    'Clean PostgreSQL migration, RLS isolation, ranking, approval, consent withdrawal, contact responses, and rate limits passed.',
  );
} finally {
  await db.close();
}

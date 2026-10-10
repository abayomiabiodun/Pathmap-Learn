import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const q = async (sql, params = []) => (await db.query(sql, params)).rows;
const fails = (sql, params = []) => assert.rejects(db.query(sql, params));
async function as(n, role = 'authenticated') {
  await db.exec(`reset role;set role ${role};`);
  await q("select set_config('request.jwt.claim.sub',$1,false)", [n ? uid(n) : '']);
}
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    '20261010000100_engagement.sql',
    '20261010000200_community.sql',
    '20261010000300_showcase.sql',
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  for (let n = 1; n <= 3; n++) {
    await q('insert into auth.users values($1)', [uid(n)]);
  }
  for (let n = 1; n <= 3; n++) {
    await as(n);
    await q('select public.join_study_circle($1,$2,$3,$4)', [
      `Learner ${n}`,
      n === 3 ? 'data' : 'web',
      'new',
      'en',
    ]);
  }
  await as(0, 'anon');
  await fails('select public.circle_showcase()');
  await as(1);
  const picture = readFileSync('tests/fixtures/showcase.jpg').toString('base64');
  await q(
    "select public.publish_circle_work('project','My picture','I sketched a useful layout today.','',$1,'My first page sketch')",
    [picture],
  );
  const pictured = (await q('select * from public.circle_showcase()'))[0];
  assert.equal(pictured.has_image, true);
  const metadata = Buffer.from(readFileSync('tests/fixtures/showcase.jpg'));
  metadata[3] = 225;
  await fails(
    "select public.publish_circle_work('project','Bad metadata','This image should not be accepted.','',$1,'A layout sketch')",
    [metadata.toString('base64')],
  );
  assert.equal(
    (await q('select public.circle_work_image($1) as photo', [pictured.id]))[0].photo.replace(
      /\s/g,
      '',
    ),
    picture,
  );
  await as(2);
  assert.equal(
    (await q('select public.circle_work_image($1) as photo', [pictured.id]))[0].photo.replace(
      /\s/g,
      '',
    ),
    picture,
  );
  await as(3);
  await fails('select public.circle_work_image($1)', [pictured.id]);
  await as(1);
  await fails('select * from public.circle_work');
  await fails(
    "select public.publish_circle_work('project','My page','I learned semantic HTML today.','javascript:alert(1)')",
  );
  await fails(
    "select public.publish_circle_work('project','My page','I learned semantic HTML today.','', 'YWJj','Bad picture')",
  );
  await q(
    "select public.publish_circle_work('project','My page','I learned semantic HTML today.','https://example.com')",
  );
  let post = (await q('select * from public.circle_showcase()'))[0];
  assert.equal(post.own, true);
  assert.equal(post.has_image, false);
  await as(3);
  assert.equal((await q('select * from public.circle_showcase()')).length, 0);
  await fails('select public.like_circle_work($1,true)', [post.id]);
  await fails('select public.circle_work_image($1)', [post.id]);
  await as(2);
  await q('select public.like_circle_work($1,true)', [post.id]);
  await q('select public.like_circle_work($1,true)', [post.id]);
  assert.equal(Number((await q('select * from public.circle_showcase()'))[0].likes), 1);
  await q('select public.comment_circle_work($1,$2)', [
    post.id,
    'Your headings make the page easier to read.',
  ]);
  let comment = (await q('select * from public.circle_work_comments($1)', [post.id]))[0];
  await fails('select public.remove_circle_work($1)', [post.id]);
  await as(1);
  await fails('select public.remove_circle_work_comment($1)', [comment.id]);
  await q('select public.report_circle_work($1,$2,$3)', [post.id, comment.id, 'spam']);
  assert.equal(
    (await q('select * from public.circle_work_comments($1)', [post.id]))[0].removed,
    true,
  );
  await as(2);
  assert.equal((await q('select * from public.circle_work_reports')).length, 0);
  assert.equal(
    (await q('select * from public.circle_work_comments($1)', [post.id]))[0].removed,
    false,
  );
  await q('select public.like_circle_work($1,false)', [post.id]);
  assert.equal(Number((await q('select * from public.circle_showcase()'))[0].likes), 0);
  await q('select public.report_circle_work($1,null,$2)', [post.id, 'unsafe']);
  assert.equal((await q('select * from public.circle_showcase()'))[0].removed, true);
  await fails('select public.circle_work_image($1)', [post.id]);
  await as(1);
  for (let n = 0; n < 3; n++)
    await q(
      "select public.publish_circle_work('update','New step','I learned another useful skill today.')",
    );
  await fails(
    "select public.publish_circle_work('update','New step','I learned another useful skill today.')",
  );
  await q('select public.remove_circle_work($1)', [post.id]);
  await fails(
    "select public.publish_circle_work('update','New step','I learned another useful skill today.')",
  );
  await q('select public.leave_study_circle()');
  await as(2);
  assert.ok((await q('select * from public.circle_showcase()')).every((p) => p.removed));
  console.log(
    'Showcase clean migration, circle isolation, unique likes, comments, private reports, deletion and publishing limits passed.',
  );
} finally {
  await db.close();
}

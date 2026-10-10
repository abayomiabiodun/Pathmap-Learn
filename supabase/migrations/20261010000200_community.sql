create table public.community_profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null check(char_length(nickname) between 2 and 30 and nickname ~ U&'^[[:alnum:]\0300-\036F ._''-]+$'),
  path text not null check(path in ('data','web','cyber','ai','design','marketing','business','writing','project','teaching')),
  level text not null check(level in ('new','basics','built')),
  language text not null check(language in ('en','pcm','yo','ha','ig','fr'))
);
create table public.study_circles (
  id uuid primary key default gen_random_uuid(), path text not null, level text not null, language text not null,
  created_at timestamptz not null default now()
);
create table public.study_circle_members (
  learner uuid primary key references public.community_profiles(id) on delete cascade,
  circle uuid not null references public.study_circles on delete cascade
);
create index study_circle_members_circle on public.study_circle_members(circle);
create table public.study_circle_posts (
  id uuid primary key default gen_random_uuid(), circle uuid not null references public.study_circles on delete cascade,
  author uuid not null references public.community_profiles(id) on delete cascade,
  parent uuid references public.study_circle_posts on delete cascade,
  body text not null check(char_length(btrim(body,E' \t\n\r')) between 10 and 2000),
  removed boolean not null default false, moderated boolean not null default false,
  created_at timestamptz not null default now()
);
create index study_circle_posts_circle on public.study_circle_posts(circle,created_at);
create table public.study_circle_reports (
  post uuid not null references public.study_circle_posts on delete cascade,
  reporter uuid not null references auth.users on delete cascade,
  reason text not null check(reason in ('spam','abuse','unsafe')),
  created_at timestamptz not null default now(), resolved boolean not null default false,
  primary key(post,reporter)
);
create table public.study_mentors (
  id uuid primary key references public.community_profiles(id) on delete cascade,
  bio text not null check(char_length(btrim(bio,E' \t\n\r')) between 20 and 500),
  approved boolean not null default false, withdrawn boolean not null default false
);
create table public.mentor_guidance (
  id uuid primary key default gen_random_uuid(), learner uuid not null references public.community_profiles(id) on delete cascade,
  mentor uuid not null references public.study_mentors(id) on delete cascade,
  question text not null check(char_length(btrim(question,E' \t\n\r')) between 10 and 2000),
  status text not null default 'pending' check(status in ('pending','answered','proposed','scheduled','closed')),
  session_at timestamptz, created_at timestamptz not null default now(), check(learner<>mentor)
);
create unique index mentor_guidance_active_pair on public.mentor_guidance(learner,mentor) where status<>'closed';
create table public.mentor_messages (
  id uuid primary key default gen_random_uuid(), request uuid not null references public.mentor_guidance on delete cascade,
  author uuid not null references auth.users on delete cascade,
  body text not null check(char_length(btrim(body,E' \t\n\r')) between 10 and 2000),
  created_at timestamptz not null default now()
);

create function public.end_unavailable_mentor_guidance() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.mentor_guidance set status='closed',session_at=null where mentor=new.id and status<>'closed';
  return new;
end $$;
create trigger end_unavailable_mentor_guidance after update of approved,withdrawn on public.study_mentors
for each row when (not new.approved or new.withdrawn) execute function public.end_unavailable_mentor_guidance();
revoke all on function public.end_unavailable_mentor_guidance() from public;

create function public.in_study_circle(p_circle uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.study_circle_members where learner=auth.uid() and circle=p_circle)
$$;
create function public.in_mentor_guidance(p_request uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.mentor_guidance g where g.id=p_request and (g.learner=auth.uid() or (g.mentor=auth.uid() and exists(select 1 from public.study_mentors m where m.id=g.mentor and m.approved and not m.withdrawn))))
$$;
alter table public.community_profiles enable row level security;
alter table public.study_circles enable row level security;
alter table public.study_circle_members enable row level security;
alter table public.study_circle_posts enable row level security;
alter table public.study_circle_reports enable row level security;
alter table public.study_mentors enable row level security;
alter table public.mentor_guidance enable row level security;
alter table public.mentor_messages enable row level security;
create policy own_community_profile on public.community_profiles for select to authenticated using(id=auth.uid());
create policy own_circle on public.study_circles for select to authenticated using(public.in_study_circle(id));
create policy own_circle_membership on public.study_circle_members for select to authenticated using(learner=auth.uid());
create policy own_report on public.study_circle_reports for select to authenticated using(reporter=auth.uid());
create policy own_mentor_application on public.study_mentors for select to authenticated using(id=auth.uid());
create policy own_guidance on public.mentor_guidance for select to authenticated using(public.in_mentor_guidance(id));
create policy own_mentor_messages on public.mentor_messages for select to authenticated using(public.in_mentor_guidance(request));
-- Posts are available only through the redacting board RPC, never as raw rows.
revoke all on public.community_profiles,public.study_circles,public.study_circle_members,public.study_circle_posts,public.study_circle_reports,public.study_mentors,public.mentor_guidance,public.mentor_messages from anon,authenticated;
grant select on public.community_profiles,public.study_circles,public.study_circle_members,public.study_circle_reports,public.study_mentors,public.mentor_guidance,public.mentor_messages to authenticated;

create function public.join_study_circle(p_nickname text,p_path text,p_level text,p_language text) returns void language plpgsql security definer set search_path='' as $$
declare chosen uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('circle-user:'||auth.uid()::text,0));
  if exists(select 1 from public.study_mentors m join public.community_profiles p on p.id=m.id where m.id=auth.uid() and m.approved and not m.withdrawn and (p.path<>p_path or p.language<>p_language)) then raise exception 'Approved mentor expertise requires administrator review'; end if;
  insert into public.community_profiles values(auth.uid(),btrim(p_nickname),p_path,p_level,p_language)
    on conflict(id) do update set nickname=excluded.nickname,path=excluded.path,level=excluded.level,language=excluded.language;
  select c.id into chosen from public.study_circle_members m join public.study_circles c on c.id=m.circle where m.learner=auth.uid() and c.path=p_path and c.level=p_level and c.language=p_language;
  if chosen is not null then return; end if;
  update public.study_circle_posts set removed=true where author=auth.uid();
  delete from public.study_circle_members where learner=auth.uid();
  perform pg_advisory_xact_lock(hashtextextended('circle-match:'||p_path||':'||p_level||':'||p_language,0));
  select c.id into chosen from public.study_circles c where c.path=p_path and c.level=p_level and c.language=p_language
    and (select count(*) from public.study_circle_members m where m.circle=c.id)<12 order by c.created_at,c.id limit 1;
  if chosen is null then insert into public.study_circles(path,level,language) values(p_path,p_level,p_language) returning id into chosen; end if;
  insert into public.study_circle_members values(auth.uid(),chosen);
end $$;
create function public.leave_study_circle() returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('circle-user:'||auth.uid()::text,0));
  update public.study_circle_posts set removed=true where author=auth.uid();
  delete from public.study_circle_members where learner=auth.uid();
  update public.study_mentors set approved=false,withdrawn=true where id=auth.uid();
end $$;
create function public.post_circle_message(p_body text,p_parent uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare room uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('circle-user:'||auth.uid()::text,0));
  select circle into room from public.study_circle_members where learner=auth.uid();
  if room is null then raise exception 'Join a circle first'; end if;
  if p_parent is not null and not exists(select 1 from public.study_circle_posts p where p.id=p_parent and p.circle=room and p.parent is null and not p.removed and not p.moderated and not exists(select 1 from public.study_circle_reports r where r.post=p.id and r.reporter=auth.uid())) then raise exception 'Thread unavailable'; end if;
  if (select count(*) from public.study_circle_posts where author=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before posting again'; end if;
  insert into public.study_circle_posts(circle,author,parent,body) values(room,auth.uid(),p_parent,btrim(p_body,E' \t\n\r'));
end $$;
create function public.remove_circle_message(p_post uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.study_circle_posts set removed=true where id=p_post and author=auth.uid();
  if not found then raise exception 'Own message required'; end if;
end $$;
create function public.report_circle_message(p_post uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.study_circle_posts p where p.id=p_post and public.in_study_circle(p.circle) and p.author<>auth.uid() and not p.removed and not p.moderated) then raise exception 'Message unavailable'; end if;
  insert into public.study_circle_reports(post,reporter,reason) values(p_post,auth.uid(),p_reason) on conflict(post,reporter) do nothing;
end $$;
create function public.study_mentors(p_path text,p_language text) returns table(id uuid,nickname text,path text,language text,bio text) language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  return query select p.id,p.nickname,p.path,p.language,m.bio from public.study_mentors m join public.community_profiles p on p.id=m.id
    where m.approved and not m.withdrawn and p.path=p_path and p.language=p_language and p.id<>auth.uid() order by p.nickname,p.id limit 30;
end $$;
create function public.apply_study_mentor(p_bio text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.study_circle_members where learner=auth.uid()) then raise exception 'Join a circle first'; end if;
  insert into public.study_mentors(id,bio) values(auth.uid(),btrim(p_bio,E' \t\n\r')) on conflict(id) do update set bio=excluded.bio,approved=false,withdrawn=false where not study_mentors.approved or study_mentors.withdrawn;
end $$;
create function public.request_mentor_guidance(p_mentor uuid,p_question text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or p_mentor=auth.uid() then raise exception 'Learner account required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('guidance-user:'||auth.uid()::text,0));
  if not exists(select 1 from public.study_circle_members where learner=auth.uid()) then raise exception 'Join a circle first'; end if;
  if not exists(select 1 from public.study_mentors m join public.community_profiles p on p.id=m.id join public.community_profiles l on l.id=auth.uid() where m.id=p_mentor and m.approved and not m.withdrawn and p.path=l.path and p.language=l.language) then raise exception 'Matching approved mentor required'; end if;
  if (select count(*) from public.mentor_guidance where learner=auth.uid() and status<>'closed')>=3 or (select count(*) from public.mentor_guidance where learner=auth.uid() and created_at>now()-interval '24 hours')>=5 then raise exception 'Guidance request limit reached'; end if;
  insert into public.mentor_guidance(learner,mentor,question) values(auth.uid(),p_mentor,btrim(p_question,E' \t\n\r'));
end $$;
create function public.send_mentor_message(p_request uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('guidance:'||p_request::text,0));
  perform pg_advisory_xact_lock(hashtextextended('guidance-messages:'||coalesce(auth.uid()::text,''),0));
  if not public.in_mentor_guidance(p_request) or not exists(select 1 from public.mentor_guidance where id=p_request and status<>'closed') then raise exception 'Conversation unavailable'; end if;
  if (select count(*) from public.mentor_messages where author=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before sending again'; end if;
  insert into public.mentor_messages(request,author,body) values(p_request,auth.uid(),btrim(p_body,E' \t\n\r'));
  update public.mentor_guidance set status='answered' where id=p_request and mentor=auth.uid() and status='pending';
end $$;
create function public.propose_mentor_session(p_request uuid,p_date timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('guidance:'||p_request::text,0));
  if p_date is null or p_date<=now() or p_date>now()+interval '90 days' then raise exception 'Future session within 90 days required'; end if;
  update public.mentor_guidance set status='proposed',session_at=p_date where id=p_request and mentor=auth.uid() and status<>'closed' and public.in_mentor_guidance(id);
  if not found then raise exception 'Assigned approved mentor required'; end if;
end $$;
create function public.confirm_mentor_session(p_request uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('guidance:'||p_request::text,0));
  update public.mentor_guidance set status='scheduled' where id=p_request and learner=auth.uid() and status='proposed' and session_at>now() and exists(select 1 from public.study_mentors where id=mentor and approved and not withdrawn);
  if not found then raise exception 'Available proposal required'; end if;
end $$;
create function public.close_mentor_guidance(p_request uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('guidance:'||p_request::text,0));
  update public.mentor_guidance set status='closed' where id=p_request and public.in_mentor_guidance(id) and status<>'closed';
  if not found then raise exception 'Conversation unavailable'; end if;
end $$;
create function public.my_study_circle() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare room uuid; result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select circle into room from public.study_circle_members where learner=auth.uid();
  select jsonb_build_object(
    'profile',(select to_jsonb(p)-'id' from public.community_profiles p where p.id=auth.uid()),
    'circle',(select jsonb_build_object('id',c.id,'path',c.path,'level',c.level,'language',c.language,'members',(select count(*) from public.study_circle_members where circle=room)) from public.study_circles c where c.id=room),
    'posts',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at,x.id) from (
      select p.id,p.parent,cp.nickname,case when p.removed or p.moderated or exists(select 1 from public.study_circle_reports r where r.post=p.id and r.reporter=auth.uid()) then '' else p.body end as body,
      p.created_at,p.author=auth.uid() as own,(p.removed or p.moderated or exists(select 1 from public.study_circle_reports r where r.post=p.id and r.reporter=auth.uid())) as removed
      from public.study_circle_posts p join public.community_profiles cp on cp.id=p.author where p.circle=room
      and (p.id in (select id from public.study_circle_posts where circle=room and parent is null order by created_at desc,id desc limit 30)
        or p.id in (select r.id from public.study_circle_posts r where r.circle=room and r.parent in (select id from public.study_circle_posts where circle=room and parent is null order by created_at desc,id desc limit 30) order by r.created_at desc,r.id desc limit 270))
      order by p.created_at desc,p.id desc limit 300
    ) x),'[]'::jsonb),
    'mentor',(select jsonb_build_object('approved',m.approved,'bio',m.bio) from public.study_mentors m where m.id=auth.uid() and not m.withdrawn),
    'guidance',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id) from (
      select g.id,cp.nickname,g.question,g.status,g.session_at,g.mentor=auth.uid() as mentor_side,g.created_at,
        coalesce((select jsonb_agg(to_jsonb(y) order by y.created_at,y.id) from (select mm.id,mm.body,mm.author=auth.uid() as own,mm.created_at from public.mentor_messages mm where mm.request=g.id order by mm.created_at desc,mm.id desc limit 100) y),'[]'::jsonb) as messages
      from public.mentor_guidance g join public.community_profiles cp on cp.id=case when g.mentor=auth.uid() then g.learner else g.mentor end
      where public.in_mentor_guidance(g.id) order by g.created_at desc,g.id desc limit 50
    ) x),'[]'::jsonb)) into result;
  return result;
end $$;
revoke all on function public.in_study_circle(uuid),public.in_mentor_guidance(uuid),public.join_study_circle(text,text,text,text),public.leave_study_circle(),public.post_circle_message(text,uuid),public.remove_circle_message(uuid),public.report_circle_message(uuid,text),public.study_mentors(text,text),public.apply_study_mentor(text),public.request_mentor_guidance(uuid,text),public.send_mentor_message(uuid,text),public.propose_mentor_session(uuid,timestamptz),public.confirm_mentor_session(uuid),public.close_mentor_guidance(uuid),public.my_study_circle() from public;
grant execute on function public.in_study_circle(uuid),public.in_mentor_guidance(uuid),public.join_study_circle(text,text,text,text),public.leave_study_circle(),public.post_circle_message(text,uuid),public.remove_circle_message(uuid),public.report_circle_message(uuid,text),public.study_mentors(text,text),public.apply_study_mentor(text),public.request_mentor_guidance(uuid,text),public.send_mentor_message(uuid,text),public.propose_mentor_session(uuid,timestamptz),public.confirm_mentor_session(uuid),public.close_mentor_guidance(uuid),public.my_study_circle() to authenticated;

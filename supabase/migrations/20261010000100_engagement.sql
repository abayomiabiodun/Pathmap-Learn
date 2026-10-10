-- Server-recorded learning only. Device history is never imported as verified activity.
create table public.learning_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 30 and nickname ~ U&'^[[:alnum:]\0300-\036F ._''-]+$'),
  path text not null check (path in ('web','data','cyber','ai','design','marketing','business','writing','project','teaching')),
  level text not null check (level in ('new','basics','built')),
  language text not null check (language in ('en','pcm','yo','ha','ig','fr')),
  location text not null default '' check (char_length(location) <= 80),
  opportunity text not null check (opportunity in ('internship','job','both')),
  leaderboard boolean not null default false,
  recruiter boolean not null default false
);
create table public.lesson_catalog (lesson text primary key, answer boolean not null);
insert into public.lesson_catalog values ('web/html',true),('web/css',false),('web/javascript',true),('data/data',true),('cyber/cyber',false),('ai/ai',false),('design/design',true),('marketing/marketing',false),('business/business',true),('writing/writing',true),('project/project',false),('teaching/teaching',true);
create table public.learning_activity (
  learner uuid not null references auth.users(id) on delete cascade,
  lesson text not null references public.lesson_catalog(lesson),
  day date not null default (current_timestamp at time zone 'Africa/Lagos')::date,
  practice text not null check (char_length(btrim(practice,E' \t\n\r')) between 20 and 10000),
  created_at timestamptz not null default current_timestamp,
  primary key (learner,lesson,day)
);
create index learning_activity_day on public.learning_activity(day,learner);
create table public.recruiter_accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  company text not null check (char_length(btrim(company)) between 2 and 100),
  approved boolean not null default false
);
create table public.recruiter_requests (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.recruiter_accounts(id) on delete cascade,
  learner uuid not null references public.learning_profiles(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 10 and 500),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  reply text not null default '' check (char_length(reply) <= 500),
  created_at timestamptz not null default current_timestamp,
  check (requester <> learner)
);
create unique index one_pending_request on public.recruiter_requests(requester,learner) where status='pending';
alter table public.learning_profiles enable row level security;
alter table public.lesson_catalog enable row level security;
alter table public.learning_activity enable row level security;
alter table public.recruiter_accounts enable row level security;
alter table public.recruiter_requests enable row level security;
revoke all on public.learning_profiles,public.lesson_catalog,public.learning_activity,public.recruiter_accounts,public.recruiter_requests from anon,authenticated;
grant select on public.learning_profiles,public.learning_activity,public.recruiter_accounts,public.recruiter_requests to authenticated;
create policy own_profile on public.learning_profiles for select to authenticated using (id=(select auth.uid()));
create policy own_activity on public.learning_activity for select to authenticated using (learner=(select auth.uid()));
create policy own_recruiter on public.recruiter_accounts for select to authenticated using (id=(select auth.uid()));
create function public.can_view_learner_request(p_learner uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.recruiter_accounts a where a.id=auth.uid() and a.approved)
    and exists(select 1 from public.learning_profiles p where p.id=p_learner and p.recruiter)
$$;
revoke all on function public.can_view_learner_request(uuid) from public;
grant execute on function public.can_view_learner_request(uuid) to authenticated;
create policy own_requests on public.recruiter_requests for select to authenticated using (
  learner=(select auth.uid()) or (requester=(select auth.uid()) and public.can_view_learner_request(learner))
);
-- Internal functions have no client execution grant; SECURITY DEFINER callers use a fixed search path.
create function public.learning_today() returns date language sql stable set search_path='' as $$ select (current_timestamp at time zone 'Africa/Lagos')::date $$;
create function public.learner_stats(p_id uuid)
returns table(active_days bigint,completed bigint,xp bigint,streak integer,last_active date)
language plpgsql stable security definer set search_path='' as $$
declare d date; previous_day date; n integer:=0; frozen boolean:=false; latest date;
begin
  select max(a.day) into latest from public.learning_activity a where a.learner=p_id and a.day<=public.learning_today();
  if latest >= public.learning_today()-2 then
    frozen := latest=public.learning_today()-2;
    for d in select distinct a.day from public.learning_activity a where a.learner=p_id and a.day<=public.learning_today() order by a.day desc loop
      if previous_day is not null then
        if previous_day-d>2 or (previous_day-d=2 and frozen) then exit; end if;
        if previous_day-d=2 then frozen:=true; end if;
      end if;
      n:=n+1; previous_day:=d;
    end loop;
  end if;
  return query select count(distinct a.day) filter(where a.day>public.learning_today()-30), count(distinct a.lesson), count(distinct a.lesson)*100+count(distinct a.day)*25,n,latest
    from public.learning_activity a where a.learner=p_id and a.day<=public.learning_today();
end $$;
create function public.record_learning_activity(p_lesson text,p_practice text,p_answer boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists(select 1 from public.lesson_catalog where lesson=p_lesson and answer=p_answer) then raise exception 'Invalid knowledge check'; end if;
  insert into public.learning_activity(learner,lesson,practice) values(auth.uid(),p_lesson,p_practice) on conflict do nothing;
end $$;
create function public.save_learning_profile(p_nickname text,p_path text,p_level text,p_language text,p_location text,p_opportunity text,p_leaderboard boolean,p_recruiter boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.learning_profiles values(auth.uid(),btrim(p_nickname),p_path,p_level,p_language,btrim(p_location),p_opportunity,p_leaderboard,p_recruiter)
  on conflict(id) do update set nickname=excluded.nickname,path=excluded.path,level=excluded.level,language=excluded.language,location=excluded.location,opportunity=excluded.opportunity,leaderboard=excluded.leaderboard,recruiter=excluded.recruiter;
end $$;
create function public.top_learners() returns table(id uuid,nickname text,path text,active_days bigint,completed bigint,xp bigint,streak integer,last_active date)
language sql stable security definer set search_path='' as $$
  select p.id,p.nickname,p.path,s.active_days,s.completed,s.xp,s.streak,s.last_active
  from public.learning_profiles p cross join lateral public.learner_stats(p.id) s
  where p.leaderboard and s.last_active>=public.learning_today()-6
  order by s.active_days desc,s.completed desc,s.xp desc,p.id limit 10
$$;
create function public.apply_recruiter(p_company text) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  insert into public.recruiter_accounts(id,company) values(auth.uid(),btrim(p_company))
    on conflict(id) do update set company=excluded.company where not recruiter_accounts.approved;
end $$;
create function public.recruiter_learners(p_path text default '',p_language text default '',p_level text default '',p_location text default '',p_opportunity text default '')
returns table(id uuid,nickname text,path text,level text,language text,location text,opportunity text,active_days bigint,completed bigint,xp bigint,streak integer,last_active date)
language plpgsql stable security definer set search_path='' as $$
begin
  if not exists(select 1 from public.recruiter_accounts a where a.id=auth.uid() and a.approved) then raise exception 'Approved recruiter required'; end if;
  return query select p.id,p.nickname,p.path,p.level,p.language,p.location,p.opportunity,s.active_days,s.completed,s.xp,s.streak,s.last_active
  from public.learning_profiles p cross join lateral public.learner_stats(p.id) s
  where p.recruiter and s.last_active>=public.learning_today()-6 and (p_path='' or p.path=p_path) and (p_language='' or p.language=p_language)
    and (p_level='' or p.level=p_level) and (p_location='' or position(lower(p_location) in lower(p.location))>0)
    and (p_opportunity='' or p.opportunity=p_opportunity or p.opportunity='both')
  order by s.active_days desc,s.completed desc,s.xp desc,p.id limit 50;
end $$;
create function public.request_learner_contact(p_learner uuid,p_message text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.recruiter_accounts a where a.id=auth.uid() and a.approved) then raise exception 'Approved recruiter required'; end if;
  if not exists(select 1 from public.learning_profiles p where p.id=p_learner and p.recruiter) then raise exception 'Learner unavailable'; end if;
  if not exists(select 1 from public.learner_stats(p_learner) s where s.last_active>=public.learning_today()-6) then raise exception 'Learner inactive'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
  if (select count(*) from public.recruiter_requests where requester=auth.uid() and created_at>current_timestamp-interval '1 day')>=10 then raise exception 'Daily request limit'; end if;
  insert into public.recruiter_requests(requester,learner,message) values(auth.uid(),p_learner,btrim(p_message));
end $$;
create function public.respond_learner_contact(p_request uuid,p_accepted boolean,p_reply text) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_accepted is null then raise exception 'Decision required'; end if;
  update public.recruiter_requests set status=case when p_accepted then 'accepted' else 'declined' end,reply=p_reply where id=p_request and learner=auth.uid() and status='pending';
  if not found then raise exception 'Request unavailable'; end if;
end $$;
create function public.my_learning_account() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select jsonb_build_object(
    'profile',(select to_jsonb(p)-'id' from public.learning_profiles p where p.id=auth.uid()),
    'recruiter',(select jsonb_build_object('company',r.company,'approved',r.approved) from public.recruiter_accounts r where r.id=auth.uid()),
    'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'company',a.company,'message',r.message,'status',r.status,'reply',r.reply) order by r.created_at desc) from public.recruiter_requests r join public.recruiter_accounts a on a.id=r.requester where r.learner=auth.uid()),'[]'::jsonb),
    'sent',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'company',p.nickname,'message',r.message,'status',r.status,'reply',r.reply) order by r.created_at desc) from public.recruiter_requests r join public.learning_profiles p on p.id=r.learner where r.requester=auth.uid() and public.can_view_learner_request(r.learner)),'[]'::jsonb),
    'stats',(select to_jsonb(s)-'last_active' from public.learner_stats(auth.uid()) s)
  ) into result;
  return result;
end $$;
revoke all on function public.learning_today(),public.learner_stats(uuid),public.record_learning_activity(text,text,boolean),public.save_learning_profile(text,text,text,text,text,text,boolean,boolean),public.top_learners(),public.apply_recruiter(text),public.recruiter_learners(text,text,text,text,text),public.request_learner_contact(uuid,text),public.respond_learner_contact(uuid,boolean,text),public.my_learning_account() from public;
grant execute on function public.top_learners() to anon,authenticated;
grant execute on function public.record_learning_activity(text,text,boolean),public.save_learning_profile(text,text,text,text,text,text,boolean,boolean),public.apply_recruiter(text),public.recruiter_learners(text,text,text,text,text),public.request_learner_contact(uuid,text),public.respond_learner_contact(uuid,boolean,text),public.my_learning_account() to authenticated;

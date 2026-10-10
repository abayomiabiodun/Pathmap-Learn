create table public.circle_work (
  id uuid primary key default gen_random_uuid(),circle uuid not null references public.study_circles on delete cascade,
  author uuid not null references public.community_profiles(id) on delete cascade,
  kind text not null check(kind in ('update','summary','project')),
  title text not null check(char_length(btrim(title,E' \t\n\r')) between 3 and 100),
  body text not null check(char_length(btrim(body,E' \t\n\r')) between 10 and 2000),
  url text not null default '' check(url='' or (char_length(url)<=500 and url ~ '^https://[[:alnum:].-]+(:[0-9]{1,5})?([/?#][^[:space:]<>]*)?$')),
  image bytea,image_alt text not null default '' check(char_length(image_alt)<=200),
  removed boolean not null default false,moderated boolean not null default false,created_at timestamptz not null default now()
);
create index circle_work_feed on public.circle_work(circle,created_at);
create table public.circle_work_likes (
  post uuid not null references public.circle_work on delete cascade,learner uuid not null references auth.users on delete cascade,
  primary key(post,learner)
);
create table public.circle_work_comments (
  id uuid primary key default gen_random_uuid(),post uuid not null references public.circle_work on delete cascade,
  author uuid not null references public.community_profiles(id) on delete cascade,
  body text not null check(char_length(btrim(body,E' \t\n\r')) between 10 and 2000),
  removed boolean not null default false,moderated boolean not null default false,created_at timestamptz not null default now()
);
create table public.circle_work_reports (
  id uuid primary key default gen_random_uuid(),post uuid not null references public.circle_work on delete cascade,
  comment uuid references public.circle_work_comments on delete cascade,reporter uuid not null references auth.users on delete cascade,
  reason text not null check(reason in ('spam','abuse','unsafe')),resolved boolean not null default false,created_at timestamptz not null default now()
);
create unique index circle_work_report_post on public.circle_work_reports(post,reporter) where comment is null;
create unique index circle_work_report_comment on public.circle_work_reports(comment,reporter) where comment is not null;
alter table public.circle_work enable row level security;
alter table public.circle_work_likes enable row level security;
alter table public.circle_work_comments enable row level security;
alter table public.circle_work_reports enable row level security;
revoke all on public.circle_work,public.circle_work_likes,public.circle_work_comments,public.circle_work_reports from anon,authenticated;
grant select on public.circle_work_reports to authenticated;
create policy own_work_reports on public.circle_work_reports for select to authenticated using(reporter=auth.uid());

create function public.valid_work_image(p_image bytea) returns boolean language plpgsql immutable set search_path='' as $$
declare size integer;pos integer:=2;marker integer;segment integer;w integer:=0;h integer:=0;
begin
  if p_image is null then return true;end if;
  size:=octet_length(p_image);
  if size<100 or size>262144 or get_byte(p_image,0)<>255 or get_byte(p_image,1)<>216 or get_byte(p_image,size-2)<>255 or get_byte(p_image,size-1)<>217 then return false;end if;
  -- Only resized JPEGs without EXIF, IPTC or comment metadata are accepted.
  if position(decode('ffe1','hex') in p_image)>0 or position(decode('ffed','hex') in p_image)>0 or position(decode('fffe','hex') in p_image)>0 then return false;end if;
  while pos<size-4 loop
    if get_byte(p_image,pos)<>255 then return false;end if;
    marker:=get_byte(p_image,pos+1);
    if marker=218 then return w between 1 and 960 and h between 1 and 960;end if;
    if marker not in (192,194,196,219,221,224,226) then return false;end if;
    segment:=get_byte(p_image,pos+2)*256+get_byte(p_image,pos+3);
    if segment<2 or pos+2+segment>size then return false;end if;
    if marker in (192,194) then
      if segment<8 or get_byte(p_image,pos+4)<>8 then return false;end if;
      h:=get_byte(p_image,pos+5)*256+get_byte(p_image,pos+6);w:=get_byte(p_image,pos+7)*256+get_byte(p_image,pos+8);
    end if;
    pos:=pos+2+segment;
  end loop;
  return false;
end $$;
create function public.can_view_circle_work(p_post uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.circle_work w where w.id=p_post and public.in_study_circle(w.circle) and not w.removed and not w.moderated and not exists(select 1 from public.circle_work_reports r where r.post=w.id and r.comment is null and r.reporter=auth.uid()))
$$;
create function public.publish_circle_work(p_kind text,p_title text,p_body text,p_url text default '',p_image text default null,p_alt text default '') returns void language plpgsql security definer set search_path='' as $$
declare room uuid;picture bytea;
begin
  if auth.uid() is null then raise exception 'Sign in required';end if;
  perform pg_advisory_xact_lock(hashtextextended('circle-user:'||auth.uid()::text,0));
  select circle into room from public.study_circle_members where learner=auth.uid();
  if room is null then raise exception 'Join a circle first';end if;
  if (select count(*) from public.circle_work where author=auth.uid() and created_at>now()-interval '24 hours')>=5 then raise exception 'Daily publishing limit reached';end if;
  if p_image is not null then
    if char_length(p_image)>350000 then raise exception 'Picture too large';end if;
    picture:=decode(p_image,'base64');
    if not public.valid_work_image(picture) or char_length(btrim(p_alt,E' \t\n\r')) not between 3 and 200 then raise exception 'Resized JPEG and image description required';end if;
  end if;
  insert into public.circle_work(circle,author,kind,title,body,url,image,image_alt) values(room,auth.uid(),p_kind,btrim(p_title,E' \t\n\r'),btrim(p_body,E' \t\n\r'),btrim(p_url),picture,case when picture is null then '' else btrim(p_alt,E' \t\n\r') end);
end $$;
create function public.circle_showcase() returns table(id uuid,nickname text,kind text,title text,body text,url text,has_image boolean,image_alt text,own boolean,removed boolean,liked boolean,likes bigint,created_at timestamptz) language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required';end if;
  return query select w.id,p.nickname,w.kind,
    case when public.can_view_circle_work(w.id) then w.title else '' end,
    case when public.can_view_circle_work(w.id) then w.body else '' end,
    case when public.can_view_circle_work(w.id) then w.url else '' end,
    public.can_view_circle_work(w.id) and w.image is not null,
    case when public.can_view_circle_work(w.id) then w.image_alt else '' end,
    w.author=auth.uid(),not public.can_view_circle_work(w.id),
    exists(select 1 from public.circle_work_likes l where l.post=w.id and l.learner=auth.uid()),
    (select count(*) from public.circle_work_likes l join public.study_circle_members m on m.learner=l.learner and m.circle=w.circle where l.post=w.id),w.created_at
  from public.circle_work w join public.community_profiles p on p.id=w.author
  where public.in_study_circle(w.circle) order by w.created_at desc,w.id desc limit 20;
end $$;
create function public.circle_work_image(p_post uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare result text;
begin
  if not public.can_view_circle_work(p_post) then raise exception 'Work unavailable';end if;
  select encode(image,'base64') into result from public.circle_work where id=p_post;
  return result;
end $$;
create function public.like_circle_work(p_post uuid,p_liked boolean) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.can_view_circle_work(p_post) then raise exception 'Work unavailable';end if;
  if p_liked then insert into public.circle_work_likes values(p_post,auth.uid()) on conflict do nothing;
  else delete from public.circle_work_likes where post=p_post and learner=auth.uid();end if;
end $$;
create function public.circle_work_comments(p_post uuid) returns table(id uuid,nickname text,body text,own boolean,removed boolean) language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_view_circle_work(p_post) then raise exception 'Work unavailable';end if;
  return query select c.id,p.nickname,case when c.removed or c.moderated or exists(select 1 from public.circle_work_reports r where r.comment=c.id and r.reporter=auth.uid()) then '' else c.body end,c.author=auth.uid(),
    c.removed or c.moderated or exists(select 1 from public.circle_work_reports r where r.comment=c.id and r.reporter=auth.uid())
  from public.circle_work_comments c join public.community_profiles p on p.id=c.author where c.post=p_post order by c.created_at desc,c.id desc limit 30;
end $$;
create function public.comment_circle_work(p_post uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('work-comment:'||coalesce(auth.uid()::text,''),0));
  if not public.can_view_circle_work(p_post) then raise exception 'Work unavailable';end if;
  if (select count(*) from public.circle_work_comments where author=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Please wait before commenting';end if;
  insert into public.circle_work_comments(post,author,body) values(p_post,auth.uid(),btrim(p_body,E' \t\n\r'));
end $$;
create function public.remove_circle_work(p_post uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.circle_work set removed=true,image=null where id=p_post and author=auth.uid();
  if not found then raise exception 'Own work required';end if;
end $$;
create function public.remove_circle_work_comment(p_comment uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.circle_work_comments set removed=true where id=p_comment and author=auth.uid();
  if not found then raise exception 'Own comment required';end if;
end $$;
create function public.report_circle_work(p_post uuid,p_comment uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.can_view_circle_work(p_post) then raise exception 'Work unavailable';end if;
  if p_comment is null then
    if exists(select 1 from public.circle_work where id=p_post and author=auth.uid()) then raise exception 'Report another learner work';end if;
  elsif not exists(select 1 from public.circle_work_comments where id=p_comment and post=p_post and author<>auth.uid() and not removed and not moderated) then raise exception 'Comment unavailable';end if;
  insert into public.circle_work_reports(post,comment,reporter,reason) values(p_post,p_comment,auth.uid(),p_reason) on conflict do nothing;
end $$;
create function public.withdraw_circle_work() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.circle_work set removed=true,image=null where author=old.learner and circle=old.circle;
  update public.circle_work_comments c set removed=true where c.author=old.learner and exists(select 1 from public.circle_work w where w.id=c.post and w.circle=old.circle);
  delete from public.circle_work_likes l using public.circle_work w where l.post=w.id and w.circle=old.circle and l.learner=old.learner;
  return old;
end $$;
create trigger withdraw_circle_work after delete on public.study_circle_members for each row execute function public.withdraw_circle_work();
revoke all on function public.valid_work_image(bytea),public.withdraw_circle_work() from public;
revoke all on function public.can_view_circle_work(uuid),public.publish_circle_work(text,text,text,text,text,text),public.circle_showcase(),public.circle_work_image(uuid),public.like_circle_work(uuid,boolean),public.circle_work_comments(uuid),public.comment_circle_work(uuid,text),public.remove_circle_work(uuid),public.remove_circle_work_comment(uuid),public.report_circle_work(uuid,uuid,text) from public;
grant execute on function public.can_view_circle_work(uuid),public.publish_circle_work(text,text,text,text,text,text),public.circle_showcase(),public.circle_work_image(uuid),public.like_circle_work(uuid,boolean),public.circle_work_comments(uuid),public.comment_circle_work(uuid,text),public.remove_circle_work(uuid),public.remove_circle_work_comment(uuid),public.report_circle_work(uuid,uuid,text) to authenticated;

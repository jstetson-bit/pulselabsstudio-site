-- EOD · Editor of Doom — Supabase schema
-- Run once: Supabase dashboard → SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE where possible).

create extension if not exists pgcrypto;

-- ---------- profiles (one per member) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_-]{3,24}$'),
  role text not null default 'member' check (role in ('member','admin')),
  bio text not null default '' check (length(bio) <= 500),
  bindings jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- new auth user -> profile (username comes from sign-up metadata)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; n int := 0; candidate text;
begin
  base := coalesce(nullif(regexp_replace(new.raw_user_meta_data->>'username', '[^A-Za-z0-9_-]', '', 'g'), ''), 'member');
  if length(base) < 3 then base := base || '_eod'; end if;
  base := left(base, 20);
  candidate := base;
  while exists (select 1 from public.profiles where lower(username) = lower(candidate)) loop
    n := n + 1; candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, candidate);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- maps ----------
create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 2 and 80),
  description text not null default '' check (length(description) <= 2000),
  data jsonb not null,
  preview jsonb,
  published boolean not null default false,
  allow_remix boolean not null default true,
  allow_download boolean not null default true,
  remix_of uuid references public.maps(id) on delete set null,
  plays integer not null default 0,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_size check (pg_column_size(data) < 4000000)
);
create index if not exists maps_pub_updated on public.maps (published, updated_at desc);
create index if not exists maps_owner on public.maps (owner);

create table if not exists public.map_versions (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.maps(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists map_versions_map on public.map_versions (map_id, created_at desc);

-- keep the previous version when map data changes; keep 20 per map
create or replace function public.map_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.data is distinct from old.data then
    insert into public.map_versions (map_id, data, created_at) values (old.id, old.data, old.updated_at);
    delete from public.map_versions where map_id = old.id and id not in
      (select id from public.map_versions where map_id = old.id order by created_at desc limit 20);
  end if;
  new.updated_at := now();
  new.owner := old.owner; new.plays := old.plays; new.score := old.score; new.remix_of := old.remix_of;
  return new;
end $$;
drop trigger if exists maps_before_update on public.maps;
create trigger maps_before_update before update on public.maps for each row execute function public.map_before_update();

-- rate limit: 5 new maps per minute per member
create or replace function public.map_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.maps where owner = new.owner and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Slow down — try again in a minute';
  end if;
  new.plays := 0; new.score := 0;
  return new;
end $$;
drop trigger if exists maps_rate on public.maps;
create trigger maps_rate before insert on public.maps for each row execute function public.map_rate_limit();

create or replace function public.add_play(map uuid) returns void
language sql security definer set search_path = public as $$
  update public.maps set plays = plays + 1 where id = map and published;
$$;

-- ---------- votes ----------
create table if not exists public.votes (
  map_id uuid not null references public.maps(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  primary key (map_id, user_id)
);
create or replace function public.votes_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare m uuid := coalesce(new.map_id, old.map_id);
begin
  update public.maps set score = coalesce((select sum(value) from public.votes where map_id = m), 0) where id = m;
  return null;
end $$;
drop trigger if exists votes_after on public.votes;
create trigger votes_after after insert or update or delete on public.votes for each row execute function public.votes_changed();

-- ---------- forums ----------
create table if not exists public.forum_categories (
  id serial primary key,
  slug text not null unique,
  name text not null,
  description text not null default '',
  sort int not null default 0,
  admin_only boolean not null default false
);
insert into public.forum_categories (slug, name, description, sort, admin_only) values
  ('announcements', 'Announcements', 'News and updates about EOD.', 1, true),
  ('show-off', 'Show Off Your Maps', 'Post your maps, get feedback.', 2, false),
  ('mapping-help', 'Mapping Help', 'Questions about building maps.', 3, false),
  ('bugs', 'Bugs & Feedback', 'Something broken? Tell us.', 4, false),
  ('general', 'General', 'Anything Doom.', 5, false)
on conflict (slug) do nothing;

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  category int not null references public.forum_categories(id) on delete cascade,
  owner uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 3 and 120),
  pinned boolean not null default false,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  last_post_at timestamptz not null default now()
);
create index if not exists threads_cat on public.threads (category, pinned desc, last_post_at desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  thread uuid not null references public.threads(id) on delete cascade,
  owner uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 2 and 10000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists posts_thread on public.posts (thread, created_at);

create or replace function public.post_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.posts where owner = new.owner and created_at > now() - interval '1 minute') >= 5 then
    raise exception 'Slow down — try again in a minute';
  end if;
  if (select locked from public.threads where id = new.thread) and not public.is_admin() then
    raise exception 'This thread is locked';
  end if;
  update public.threads set last_post_at = now() where id = new.thread;
  return new;
end $$;
drop trigger if exists posts_before_insert on public.posts;
create trigger posts_before_insert before insert on public.posts for each row execute function public.post_before_insert();

create or replace function public.thread_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select admin_only from public.forum_categories where id = new.category) and not public.is_admin() then
    raise exception 'Only admins post here';
  end if;
  new.pinned := false; new.locked := false;
  return new;
end $$;
drop trigger if exists threads_before_insert on public.threads;
create trigger threads_before_insert before insert on public.threads for each row execute function public.thread_before_insert();

-- ---------- reports ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('map','post','thread','user')),
  target uuid not null,
  reporter uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.maps enable row level security;
alter table public.map_versions enable row level security;
alter table public.votes enable row level security;
alter table public.forum_categories enable row level security;
alter table public.threads enable row level security;
alter table public.posts enable row level security;
alter table public.reports enable row level security;

drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- members may change only these columns (role is admin-only, set in SQL)
revoke update on public.profiles from anon, authenticated;
grant update (username, bio, bindings) on public.profiles to authenticated;

drop policy if exists "maps read" on public.maps;
create policy "maps read" on public.maps for select using (published or owner = auth.uid() or public.is_admin());
drop policy if exists "maps insert" on public.maps;
create policy "maps insert" on public.maps for insert with check (owner = auth.uid());
drop policy if exists "maps update" on public.maps;
create policy "maps update" on public.maps for update using (owner = auth.uid() or public.is_admin());
drop policy if exists "maps delete" on public.maps;
create policy "maps delete" on public.maps for delete using (owner = auth.uid() or public.is_admin());

drop policy if exists "versions read own" on public.map_versions;
create policy "versions read own" on public.map_versions for select using (exists (select 1 from public.maps m where m.id = map_id and (m.owner = auth.uid() or public.is_admin())));

drop policy if exists "votes read" on public.votes;
create policy "votes read" on public.votes for select using (true);
drop policy if exists "votes write own" on public.votes;
create policy "votes write own" on public.votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cats read" on public.forum_categories;
create policy "cats read" on public.forum_categories for select using (true);

drop policy if exists "threads read" on public.threads;
create policy "threads read" on public.threads for select using (true);
drop policy if exists "threads insert" on public.threads;
create policy "threads insert" on public.threads for insert with check (owner = auth.uid());
drop policy if exists "threads mod" on public.threads;
create policy "threads mod" on public.threads for update using (public.is_admin());
drop policy if exists "threads delete" on public.threads;
create policy "threads delete" on public.threads for delete using (owner = auth.uid() or public.is_admin());

drop policy if exists "posts read" on public.posts;
create policy "posts read" on public.posts for select using (true);
drop policy if exists "posts insert" on public.posts;
create policy "posts insert" on public.posts for insert with check (owner = auth.uid());
drop policy if exists "posts update" on public.posts;
create policy "posts update" on public.posts for update using (owner = auth.uid() or public.is_admin());
drop policy if exists "posts delete" on public.posts;
create policy "posts delete" on public.posts for delete using (owner = auth.uid() or public.is_admin());

drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert with check (reporter = auth.uid());
drop policy if exists "reports admin" on public.reports;
create policy "reports admin" on public.reports for select using (public.is_admin());
drop policy if exists "reports resolve" on public.reports;
create policy "reports resolve" on public.reports for delete using (public.is_admin());

-- ---------- make yourself admin (run AFTER you sign up on the site) ----------
-- update public.profiles set role = 'admin' where username = 'YOUR_USERNAME';

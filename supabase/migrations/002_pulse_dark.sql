-- 002: Pulse Dark Pro, page reports from the extension, and Pulse Labs' own site-fix list.
-- Run after 001_store.sql (Supabase SQL editor, or `supabase db push`).

-- Pulse Dark Pro: one time, $14.99 tax included (Paddle price set to tax-inclusive). Switched on (active) once
-- its Paddle price id is filled in.
insert into public.products (id, name, purpose, systems, price_cents, sort) values
  ('pulse-dark-pro', 'Pulse Dark Pro', 'Pick and recolor, Uniform, Flatten, every theme, schedules and more. One time.', '{chrome}', 1499, 61)
on conflict (id) do nothing;

-- Who may see reports and publish fixes (Jason's account; add others by user id)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
create policy "admins see admins" on public.admins for select using (public.is_admin());

-- "Report this page": written only by the page-report function (service role); read and handled by admins
create table if not exists public.page_reports (
  id          text primary key,                      -- 'R-20261125-162801-ab3x'
  created_at  timestamptz not null default now(),
  product     text not null default 'pulse-dark',
  url         text not null,
  host        text not null,
  note        text not null default '',
  version     text not null default '',
  browser     text not null default '',
  settings    jsonb not null default '{}'::jsonb,    -- mode, engine, theme, switches for that site
  shot_path   text,                                  -- storage: reports/<id>.jpg
  ip_hash     text not null default '',              -- for the rate limit only (salted hash, never the address)
  status      text not null default 'new',           -- new | fixing | fixed | wontfix | duplicate
  fix_id      bigint,
  admin_note  text not null default ''
);
create index if not exists page_reports_host on public.page_reports (host);
create index if not exists page_reports_created on public.page_reports (created_at desc);
alter table public.page_reports enable row level security;
create policy "admins read reports"   on public.page_reports for select using (public.is_admin());
create policy "admins update reports" on public.page_reports for update using (public.is_admin());
create policy "admins delete reports" on public.page_reports for delete using (public.is_admin());

-- Pulse Labs' own site fixes: plain style rules (never code), downloaded by every Pulse Dark about once a day
create table if not exists public.site_fixes (
  id          bigserial primary key,
  updated_at  timestamptz not null default now(),
  product     text not null default 'pulse-dark',
  hosts       text[] not null,                       -- 'doordash.com', 'www.amazon.com', '*.ebay.com'
  css         text not null default '',              -- extra style rules for dark mode on those sites
  invert      text not null default '',              -- selectors to flip (like the community list's INVERT)
  no_invert   text not null default '',              -- selectors never to flip
  notes       text not null default '',              -- why (report ids)
  published   boolean not null default false
);
alter table public.site_fixes enable row level security;
create policy "published fixes are public" on public.site_fixes for select using (published or public.is_admin());
create policy "admins write fixes"  on public.site_fixes for insert with check (public.is_admin());
create policy "admins edit fixes"   on public.site_fixes for update using (public.is_admin());
create policy "admins delete fixes" on public.site_fixes for delete using (public.is_admin());
create or replace function public.touch_fix() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists site_fixes_touch on public.site_fixes;
create trigger site_fixes_touch before update on public.site_fixes for each row execute function public.touch_fix();

-- Screenshots: a private bucket; only admins can look
insert into storage.buckets (id, name, public) values ('reports', 'reports', false) on conflict (id) do nothing;
create policy "admins read report shots" on storage.objects for select using (bucket_id = 'reports' and public.is_admin());
create policy "admins delete report shots" on storage.objects for delete using (bucket_id = 'reports' and public.is_admin());

-- Make Jason an admin (run once after signing up on the site with your email):
-- insert into public.admins (user_id) select id from auth.users where email = '<your email>';

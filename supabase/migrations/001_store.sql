-- Pulse Labs store: accounts, carts, orders, owned products (Pulse keys). Supabase / Postgres.
-- Row-level security: every customer can only ever see and change their own rows. Orders and keys are written only by
-- the payment webhook (service role), never by a browser.

create table if not exists public.products (
  id            text primary key,                 -- 'plspdf', 'keyboardstudio', 'bundle-phone-armor'
  name          text not null,
  purpose       text not null default '',         -- one line: what it's for
  systems       text[] not null default '{}',     -- {'android','windows','chrome'}
  price_cents   integer not null default 0,       -- what our site charges (always at or under Play)
  play_cents    integer,                          -- Play Store price, shown for comparison
  play_url      text,
  paddle_price  text unique,                      -- Paddle price id (pri_...)
  bundle        text[] not null default '{}',     -- a bundle lists the products it unlocks
  active        boolean not null default false,   -- only active products are on sale
  sort          integer not null default 100,
  created_at    timestamptz not null default now()
);

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  text not null references public.products(id),
  quantity    integer not null default 1 check (quantity between 1 and 10),
  added_at    timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,
  provider         text not null,                 -- 'paddle'
  provider_txn_id  text not null unique,          -- the same payment can never be recorded twice
  status           text not null,                 -- 'paid', 'refunded'
  currency         text not null default 'USD',
  total_cents      integer not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists public.order_items (
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  text references public.products(id),
  price_id    text,
  quantity    integer not null default 1,
  unit_cents  integer not null default 0
);

create table if not exists public.licenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  product_id  text not null references public.products(id),
  order_id    uuid references public.orders(id) on delete set null,
  pulse_key   text not null unique,
  revoked     boolean not null default false,
  issued_at   timestamptz not null default now()
);

alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.licenses    enable row level security;

-- the catalog is public (only what's on sale)
create policy "catalog is public" on public.products for select using (active);
-- your own profile
create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
-- your own cart, and only once your email is verified
create policy "own cart" on public.cart_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null));
-- your own orders, items and keys: read only (the webhook writes them)
create policy "own orders" on public.orders      for select using (auth.uid() = user_id);
create policy "own items"  on public.order_items for select using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "own keys"   on public.licenses    for select using (auth.uid() = user_id);

-- a profile row for every new account
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- starting catalog: names only, NOT on sale (active=false) until Jason sets prices and Paddle price ids
insert into public.products (id, name, purpose, systems, sort) values
  ('plspdf',          'PLS PDF',          'Read, sign, merge and build PDFs. Offline, no subscription.', '{android,windows}', 10),
  ('keyboardstudio',  'Keyboard Studio',  'Design and use your own themed Android keyboard.',          '{android}',         20),
  ('plsmark',         'PulseMark',        'Snip the screen and mark it up.',                           '{windows,android}', 30),
  ('pls-launcher',    'PLS Launcher',     'Open the whole Pulse family in one tap.',                   '{android}',         40),
  ('pulse-meter',     'Pulse Meter',      'Your usage limits at a glance, before you hit the wall.',                        '{chrome,windows,android}', 50),
  ('pulse-dark',      'Pulse Dark',       'Dark mode for every website.',                              '{chrome}',          60),
  ('pls-authenticator','PLS Authenticator','Offline password vault and 2FA codes.',                     '{android}',         70),
  ('pulse-meds',      'Pulse Meds',       'Offline medication reminders.',                             '{android}',         80)
on conflict (id) do nothing;

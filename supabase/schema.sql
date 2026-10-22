-- Moo — Supabase Postgres schema + Row Level Security.
-- Run this once in the Supabase SQL editor (or psql) after creating the project.
--
-- Tables: profiles, animals (with the averaged muzzle fingerprint), posts
-- (comments stored inline as jsonb), and messages. Every table has RLS so a
-- villager on phone A and a neighbor on phone B share data safely:
--   * profiles   — readable by any signed-in user; writable by its owner.
--   * animals    — readable by any signed-in user (needed for matching);
--                  writable by the owner.
--   * posts      — readable by any signed-in user; writable by the author.
--   * messages   — readable/writable by any signed-in user (village chat).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user (auto-created on signup).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles readable by signed-in villagers"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Copy name/phone from auth metadata into a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- animals — one row per registered animal. fingerprint is the 1280-number
-- MobileNet embedding averaged over frame_count registration frames.
-- ---------------------------------------------------------------------------
create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null default 'cow',
  breed text not null default '',
  notes text not null default '',
  photo text not null default '',
  fingerprint jsonb not null default '[]'::jsonb,
  frame_count int not null default 1,
  reminders jsonb not null default '[]'::jsonb,
  tag_number text not null default '',
  vaccinations jsonb not null default '[]'::jsonb,
  health jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists animals_owner_idx on public.animals(owner_id);

-- Biosafety columns (added for the vet-passport upgrade); safe on fresh + existing DBs.
alter table public.animals add column if not exists tag_number text not null default '';
alter table public.animals add column if not exists vaccinations jsonb not null default '[]'::jsonb;
alter table public.animals add column if not exists health jsonb not null default '[]'::jsonb;

alter table public.animals enable row level security;

create policy "animals readable by signed-in villagers"
  on public.animals for select
  to authenticated
  using (true);

create policy "owners can insert animals"
  on public.animals for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "owners can update their animals"
  on public.animals for update
  to authenticated
  using (auth.uid() = owner_id);

create policy "owners can delete their animals"
  on public.animals for delete
  to authenticated
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- posts — lost-and-found feed. comments is a jsonb array of
-- { id, from, text, createdAt } to keep the POC simple.
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  photo text not null default '',
  note text not null default '',
  type text not null default 'other',
  category text not null default 'lost',
  location text not null default '',
  comments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_idx on public.posts(user_id);

alter table public.posts add column if not exists category text not null default 'lost';

alter table public.posts enable row level security;

create policy "posts readable by signed-in villagers"
  on public.posts for select
  to authenticated
  using (true);

create policy "users can insert posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = user_id);

create policy "users can delete their posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- messages — village chat (text and voice notes as data-URL strings).
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '',
  audio text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_idx on public.messages(sender_id);

alter table public.messages enable row level security;

create policy "messages readable by signed-in villagers"
  on public.messages for select
  to authenticated
  using (true);

create policy "users can send messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = sender_id);

-- ---------------------------------------------------------------------------
-- Personal vet chat: farmers see the village thread + their own vet thread;
-- the vet (profiles.is_vet = true) sees everything. Run this manually in the
-- Supabase SQL editor (not applied automatically).
-- ---------------------------------------------------------------------------
alter table public.messages add column if not exists thread text not null default 'village';
alter table public.profiles add column if not exists is_vet boolean not null default false;

drop policy if exists "messages readable by signed-in villagers" on public.messages;
drop policy if exists "users can send messages" on public.messages;

create policy "read village chat and own vet thread" on public.messages for select to authenticated
  using (thread = 'village' or thread = auth.uid()::text
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vet));

create policy "send to village or own vet thread" on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and (thread = 'village' or thread = auth.uid()::text
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_vet)));

-- Assign the vet role manually after creating the vet account:
-- update public.profiles set is_vet = true where id = '<vet uuid>';

-- ---------------------------------------------------------------------------
-- Rating (village leaderboard): points live in an activity journal, so daily
-- tasks (feeding, cleaning, hygiene, care) can be added later without changing
-- the rating screen or the view.
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                 -- 'vaccination', later 'feeding', 'cleaning', 'hygiene', 'care'
  points int not null default 0,
  animal_id uuid references public.animals(id) on delete set null,
  day date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_day_idx on public.activity_log(user_id, day);
alter table public.activity_log enable row level security;

drop policy if exists "activity readable by signed-in villagers" on public.activity_log;
drop policy if exists "users log their own activity" on public.activity_log;

create policy "activity readable by signed-in villagers" on public.activity_log for select to authenticated using (true);
create policy "users log their own activity" on public.activity_log for insert to authenticated with check (auth.uid() = user_id);

create or replace view public.leaderboard as
select p.id as user_id, p.name,
       coalesce(sum(a.points), 0)::int as points_all,
       coalesce(sum(a.points) filter (where a.day >= current_date - 6), 0)::int as points_week
from public.profiles p left join public.activity_log a on a.user_id = p.id
group by p.id, p.name;

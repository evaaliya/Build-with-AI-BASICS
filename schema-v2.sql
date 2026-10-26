-- Moo v2 — schema (applied to Supabase project Moo / rvhhmpnpggtfufwpgdaw
-- as migration moo_v2_cabinets_slots_bookings). Keep this file as the source of truth.
-- Cabinets, slots, bookings, vaccinations, broadcasts, book_slot, points trigger.
-- Existing baseline: supabase/schema.sql (later: supabase/sql/001_baseline.sql).
-- App falls back to localStorage when tables/columns are missing (isSchemaError).

-- ---------------------------------------------------------------------------
-- profiles.role (replaces browser vet code; admin assigns 'vet')
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'farmer'
  check (role in ('farmer', 'vet'));

-- Keep legacy is_vet in sync if present (optional bridge).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_vet'
  ) then
    update public.profiles set role = 'vet' where is_vet = true and role <> 'vet';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- slots — vet reception windows (published to feed)
-- ---------------------------------------------------------------------------
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  vet_id uuid references public.profiles(id),
  day date not null,
  time_from time not null,
  time_to time not null,
  place text,
  disease text,
  capacity int not null check (capacity > 0),
  booked int not null default 0,
  created_at timestamptz default now()
);

create index if not exists slots_day_idx on public.slots(day);

alter table public.slots enable row level security;

drop policy if exists "slots readable by signed-in" on public.slots;
drop policy if exists "vet inserts slots" on public.slots;
drop policy if exists "vet updates own slots" on public.slots;

create policy "slots readable by signed-in"
  on public.slots for select to authenticated using (true);

create policy "vet inserts slots"
  on public.slots for insert to authenticated
  with check (
    auth.uid() = vet_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

create policy "vet updates own slots"
  on public.slots for update to authenticated
  using (
    auth.uid() = vet_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

-- ---------------------------------------------------------------------------
-- bookings — queue entries for a slot
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid references public.slots(id) on delete cascade,
  farmer_id uuid references public.profiles(id),
  animal_ids uuid[] not null,
  heads int not null check (heads > 0),
  queue_no int not null,
  status text not null default 'booked'
    check (status in ('booked', 'came', 'done', 'no_show', 'cancelled')),
  created_at timestamptz default now()
);

create index if not exists bookings_slot_idx on public.bookings(slot_id);
create index if not exists bookings_farmer_idx on public.bookings(farmer_id);

alter table public.bookings enable row level security;

drop policy if exists "farmer reads own bookings" on public.bookings;
drop policy if exists "vet reads slot bookings" on public.bookings;
drop policy if exists "farmer inserts own bookings" on public.bookings;
drop policy if exists "booking status updates" on public.bookings;

create policy "farmer reads own bookings"
  on public.bookings for select to authenticated
  using (
    farmer_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

create policy "farmer inserts own bookings"
  on public.bookings for insert to authenticated
  with check (farmer_id = auth.uid());

create policy "booking status updates"
  on public.bookings for update to authenticated
  using (
    farmer_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

-- ---------------------------------------------------------------------------
-- vaccinations — claimed by farmer (no points) / verified by vet (rewards)
-- ---------------------------------------------------------------------------
create table if not exists public.vaccinations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references public.animals(id) on delete cascade,
  disease text not null,
  done_at date not null,
  valid_until date not null,
  status text not null default 'claimed'
    check (status in ('claimed', 'verified')),
  verified_by uuid references public.profiles(id),
  booking_id uuid references public.bookings(id),
  created_at timestamptz default now()
);

create index if not exists vaccinations_animal_idx on public.vaccinations(animal_id);

alter table public.vaccinations enable row level security;

drop policy if exists "vaccinations readable" on public.vaccinations;
drop policy if exists "owner claims vaccination" on public.vaccinations;
drop policy if exists "vet verifies vaccination" on public.vaccinations;

create policy "vaccinations readable"
  on public.vaccinations for select to authenticated using (true);

create policy "owner claims vaccination"
  on public.vaccinations for insert to authenticated
  with check (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.owner_id = auth.uid()
    )
    and status = 'claimed'
  );

create policy "vet verifies vaccination"
  on public.vaccinations for insert to authenticated
  with check (
    status = 'verified'
    and verified_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

create policy "vet updates vaccination status"
  on public.vaccinations for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet'));

-- ---------------------------------------------------------------------------
-- broadcasts — vet segment messages
-- ---------------------------------------------------------------------------
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  vet_id uuid references public.profiles(id),
  segment text not null,
  text text not null,
  post_to_feed boolean default false,
  created_at timestamptz default now()
);

alter table public.broadcasts enable row level security;

drop policy if exists "broadcasts readable" on public.broadcasts;
drop policy if exists "vet writes broadcasts" on public.broadcasts;

create policy "broadcasts readable"
  on public.broadcasts for select to authenticated using (true);

create policy "vet writes broadcasts"
  on public.broadcasts for insert to authenticated
  with check (
    vet_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

-- ---------------------------------------------------------------------------
-- messages.thread — village | farmer_id (personal vet chat)
-- ---------------------------------------------------------------------------
alter table public.messages add column if not exists thread text not null default 'village';
alter table public.messages add column if not exists booking_id uuid;

-- Refresh RLS for threads (farmer: own + village; vet: all personal + village)
drop policy if exists "read village chat and own vet thread" on public.messages;
drop policy if exists "send to village or own vet thread" on public.messages;
drop policy if exists "messages readable by signed-in villagers" on public.messages;
drop policy if exists "users can send messages" on public.messages;

create policy "read village or own thread or vet all"
  on public.messages for select to authenticated
  using (
    thread = 'village'
    or thread = auth.uid()::text
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
  );

create policy "send village or own thread or vet reply"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and (
      thread = 'village'
      or thread = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
    )
  );

-- ---------------------------------------------------------------------------
-- book_slot — atomic capacity check + queue number
-- ---------------------------------------------------------------------------
create or replace function public.book_slot(p_slot uuid, p_animals uuid[])
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.slots;
  b public.bookings;
  n int := coalesce(array_length(p_animals, 1), 0);
begin
  if n is null or n < 1 then
    raise exception 'no_animals';
  end if;

  select * into s from public.slots where id = p_slot for update;
  if not found then
    raise exception 'slot_not_found';
  end if;
  if s.booked + n > s.capacity then
    raise exception 'no_capacity';
  end if;

  update public.slots set booked = booked + n where id = p_slot;

  insert into public.bookings(slot_id, farmer_id, animal_ids, heads, queue_no, status)
  values (p_slot, auth.uid(), p_animals, n, s.booked + 1, 'booked')
  returning * into b;

  return b;
end;
$$;

revoke all on function public.book_slot(uuid, uuid[]) from public;
grant execute on function public.book_slot(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Points only for verified vaccinations (server-side)
-- ---------------------------------------------------------------------------
create or replace function public.on_vaccination_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  streak int;
  pts int := 100;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'verified' then
      return new;
    end if;
  elsif tg_op = 'UPDATE' then
    if not (old.status is distinct from 'verified' and new.status = 'verified') then
      return new;
    end if;
  end if;

  select a.owner_id into owner from public.animals a where a.id = new.animal_id;
  if owner is null then
    return new;
  end if;

  select count(*)::int into streak
  from public.vaccinations v
  where v.animal_id = new.animal_id and v.status = 'verified';

  if streak > 1 then
    pts := pts + 50; -- streak bonus per architecture
  end if;

  insert into public.activity_log(user_id, kind, points, animal_id)
  values (owner, 'vaccination_verified', pts, new.animal_id);

  return new;
end;
$$;

drop trigger if exists vaccination_verified_points on public.vaccinations;
create trigger vaccination_verified_points
  after insert or update on public.vaccinations
  for each row execute function public.on_vaccination_verified();

-- Optional: posts.slot_id for feed cards of receptions
alter table public.posts add column if not exists slot_id uuid references public.slots(id) on delete set null;
alter table public.posts add column if not exists kind text; -- 'slot' | 'alert' | 'user'

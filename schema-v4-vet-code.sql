-- Moo v4 — vet invite code path (Edge Function only).
-- Run AFTER schema-v3-auth.sql. Idempotent / safe to re-run.
-- Applications are inserted only by the Edge Function (service role).
-- review_vet_application and moo.allow_role_change stay unchanged.

-- ---------------------------------------------------------------------------
-- 1. Rate-limit table for failed invite-code attempts (service role only)
-- ---------------------------------------------------------------------------
create table if not exists public.vet_code_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists vet_code_attempts_user_time_idx
  on public.vet_code_attempts (user_id, attempted_at desc);

alter table public.vet_code_attempts enable row level security;
-- No policies for anon/authenticated: only service_role (bypasses RLS) may read/write.

revoke all on public.vet_code_attempts from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- 2. Revoke / drop client-callable submit_vet_application from schema-v3
--    Signature from schema-v3-auth.sql: (text, text, text)
-- ---------------------------------------------------------------------------
revoke execute on function public.submit_vet_application(text, text, text)
  from anon, authenticated, public;

drop function if exists public.submit_vet_application(text, text, text);

-- ---------------------------------------------------------------------------
-- 3. Clients must not INSERT or UPDATE vet_applications
--    Keep: owner SELECT own rows; admin SELECT + UPDATE (review)
-- ---------------------------------------------------------------------------
drop policy if exists "vet_app owner insert" on public.vet_applications;

-- Ensure no stray write policies for non-admins
drop policy if exists "vet_app owner update" on public.vet_applications;
drop policy if exists "vet_app insert" on public.vet_applications;

-- Re-assert read / admin update (idempotent with v3 names)
drop policy if exists "vet_app owner read" on public.vet_applications;
drop policy if exists "vet_app admin update" on public.vet_applications;

create policy "vet_app owner read"
  on public.vet_applications for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "vet_app admin update"
  on public.vet_applications for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 4. animals_public — MUST keep live column order (CREATE OR REPLACE cannot
--    rename/reorder columns). Live order:
--    id, owner_id, name, type, breed, notes, photo, fingerprint, frame_count,
--    reminders, tag_number, created_at, vaccinations, health
--    notes/reminders: owner only; vaccinations/health: owner or vet.
-- ---------------------------------------------------------------------------
create or replace view public.animals_public as
select
  a.id,
  a.owner_id,
  a.name,
  a.type,
  a.breed,
  case when a.owner_id = auth.uid() then a.notes else null end as notes,
  a.photo,
  a.fingerprint,
  a.frame_count,
  case when a.owner_id = auth.uid() then a.reminders else null end as reminders,
  a.tag_number,
  a.created_at,
  case when a.owner_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
       then a.vaccinations else '[]'::jsonb end as vaccinations,
  case when a.owner_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet')
       then a.health else '[]'::jsonb end as health
from public.animals a;

revoke all on public.animals_public from anon, public;
grant select on public.animals_public to authenticated;

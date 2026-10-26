-- Moo v3 — auth, admin role, vet applications, license storage.
-- File: supabase/sql/003_auth_roles_vet_applications.sql (formerly schema-v3-auth.sql).
-- Idempotent / safe to re-run. Does NOT recreate animals_public (column order
-- is fixed in supabase/sql/004_vet_code_and_masking.sql to match the live view).
-- Prerequisite: supabase/sql/002_booking_vaccinations.sql + protect_profile_role + animals_public baseline.

-- ---------------------------------------------------------------------------
-- 1. profiles: allow role 'admin'; add email + house_id
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('farmer', 'vet', 'admin'));

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists house_id int;

-- ---------------------------------------------------------------------------
-- 2. protect_profile_role — allow role change only via moo.allow_role_change
--    (set inside SECURITY DEFINER review_vet_application). Never allow client
--    to set role = 'admin'. INSERT still forced to farmer for authenticated.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allow_change text;
begin
  allow_change := coalesce(current_setting('moo.allow_role_change', true), '');

  if auth.role() = 'authenticated' then
    if tg_op = 'INSERT' then
      -- clients may only create farmer profiles; admin is never set from client
      if new.role is distinct from 'farmer' then
        new.role := 'farmer';
      end if;
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      -- never allow client to become admin
      if new.role = 'admin' then
        raise exception 'role_change_forbidden';
      end if;
      -- vet promotion only when definer function flipped the flag
      if allow_change is distinct from 'on' then
        raise exception 'role_change_forbidden';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- 3. vet_applications
-- ---------------------------------------------------------------------------
create table if not exists public.vet_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  license_no text not null,
  authority text not null default '',
  photo_path text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists vet_applications_status_idx on public.vet_applications(status);

alter table public.vet_applications enable row level security;

drop policy if exists "vet_app owner insert" on public.vet_applications;
drop policy if exists "vet_app owner read" on public.vet_applications;
drop policy if exists "vet_app admin read" on public.vet_applications;
drop policy if exists "vet_app admin update" on public.vet_applications;

create policy "vet_app owner insert"
  on public.vet_applications for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

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
-- 4. Storage bucket vet-licenses (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('vet-licenses', 'vet-licenses', false)
on conflict (id) do update set public = false;

drop policy if exists "vet license own upload" on storage.objects;
drop policy if exists "vet license own read" on storage.objects;
drop policy if exists "vet license admin read" on storage.objects;

create policy "vet license own upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vet-licenses'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vet license own read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vet-licenses'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "vet license admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vet-licenses'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- 5. submit_vet_application (authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.submit_vet_application(
  p_license_no text,
  p_authority text,
  p_photo_path text
)
returns public.vet_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.vet_applications;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if coalesce(trim(p_license_no), '') = '' then
    raise exception 'license_required';
  end if;

  insert into public.vet_applications (user_id, license_no, authority, photo_path, status)
  values (auth.uid(), trim(p_license_no), coalesce(trim(p_authority), ''), coalesce(p_photo_path, ''), 'pending')
  on conflict (user_id) do update
    set license_no = excluded.license_no,
        authority = excluded.authority,
        photo_path = excluded.photo_path,
        status = 'pending',
        reviewed_by = null,
        reviewed_at = null,
        created_at = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.submit_vet_application(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. review_vet_application (admin only) — flips moo.allow_role_change
-- ---------------------------------------------------------------------------
create or replace function public.review_vet_application(
  p_application_id uuid,
  p_approve boolean
)
returns public.vet_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.vet_applications;
  is_admin boolean;
begin
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'admin_required';
  end if;

  select * into app from public.vet_applications where id = p_application_id for update;
  if not found then
    raise exception 'application_not_found';
  end if;
  if app.status <> 'pending' then
    raise exception 'already_reviewed';
  end if;

  if p_approve then
    perform set_config('moo.allow_role_change', 'on', true);
    update public.profiles set role = 'vet' where id = app.user_id;
    update public.vet_applications
      set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_application_id
      returning * into app;
  else
    update public.vet_applications
      set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_application_id
      returning * into app;
  end if;

  return app;
end;
$$;

grant execute on function public.review_vet_application(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. First admin (run manually after a user signs up — replace the UUID):
--    update public.profiles set role = 'admin' where id = '<uuid>';
--    (SQL editor / service_role bypasses protect_profile_role authenticated branch)
-- ---------------------------------------------------------------------------

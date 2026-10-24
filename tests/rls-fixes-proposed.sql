-- Moo: усиление RLS, версия 2. Выполняй ЧАСТЯМИ, по порядку. Каждая часть отделена комментарием.

-- ============ ЧАСТЬ A. Защита роли (применять сейчас, безопасно) ============
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- блокируем только вошедших пользователей; SQL-редактор и service_role проходят
  if auth.role() = 'authenticated' then
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'role_change_forbidden';
    end if;
    if tg_op = 'INSERT' and new.role is distinct from 'farmer' then
      new.role := 'farmer';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

-- проверь, кто сейчас ветеринар (должен быть только N), остальных верни в farmer:
-- select id, name, role from public.profiles where role = 'vet';
-- update public.profiles set role = 'farmer' where id = '<лишний id>';
-- назначить ветеринара (из SQL-редактора): update public.profiles set role = 'vet' where id = '<id N>';


-- ============ ЧАСТЬ B. Только просмотр (ничего не меняет) ============
-- Реальные названия политик и колонок:
-- select tablename, policyname, cmd, qual from pg_policies where schemaname = 'public' order by tablename;
-- select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'animals';
-- select to_regclass('public.vaccinations'), to_regclass('public.activity_log');


-- ============ ЧАСТЬ C. Закрытие утечки (только после переключения приложения на view) ============
-- Column order MUST match live animals_public (CREATE OR REPLACE cannot rename columns):
-- id, owner_id, name, type, breed, notes, photo, fingerprint, frame_count,
-- reminders, tag_number, created_at, vaccinations, health
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

-- 2) Сузить прямое чтение таблицы animals (имя политики возьми из части B):
-- drop policy "animals readable by signed-in villagers" on public.animals;
-- create policy "animals readable by owner or vet" on public.animals for select to authenticated
--   using (owner_id = auth.uid()
--          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet'));

-- 3) Таблица vaccinations (имя политики из части B):
-- drop policy "<имя из части B>" on public.vaccinations;
-- create policy "vaccinations readable by owner or vet" on public.vaccinations for select to authenticated
--   using (exists (select 1 from public.animals a where a.id = animal_id
--          and (a.owner_id = auth.uid()
--               or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'vet'))));

-- activity_log НЕ трогаем: рейтингу нужны очки соседей.

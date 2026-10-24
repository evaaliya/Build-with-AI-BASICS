# Part B — снимок с прод-БД Moo (только чтение)

Дата прогона: 2026-10-23

## animals — колонки

| column_name | data_type |
|---|---|
| id | uuid |
| owner_id | uuid |
| name | text |
| type | text |
| breed | text |
| notes | text |
| photo | text |
| fingerprint | jsonb |
| frame_count | integer |
| reminders | jsonb |
| tag_number | text |
| vaccinations | jsonb |
| health | jsonb |
| created_at | timestamptz |

В view из `rls-fixes-proposed.sql` не хватает `notes` и `reminders` — в применённой Part C они добавлены (файл SQL не менялся).

## Ключевые SELECT-политики (после Part C)

| table | policyname | qual (кратко) |
|---|---|---|
| animals | animals readable by owner or vet | owner или role=vet |
| vaccinations | vaccinations readable by owner or vet | owner животного или vet |
| activity_log | activity readable by signed-in villagers | true (не трогали) |

Старое имя `animals readable by signed-in villagers` / `vaccinations readable` — сняты.

## Таблицы

- `vaccinations` — есть
- `activity_log` — есть
- `animals_public` — есть

## Ветеринары

`select … where role = 'vet'` → **0 строк**. Назначь Нурлана из SQL-редактора.

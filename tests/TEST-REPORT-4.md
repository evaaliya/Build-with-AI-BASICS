# Moo — test report 4 (migrations applied + Edge Function deployed)

Date: 2026-10-24  
Project: Supabase `rvhhmpnpggtfufwpgdaw`. No secrets in this report.

---

## 1. Pre-apply live state (verified before changes)

Already present (from earlier runs / partial apply):

| Object | Status before this pass |
|---|---|
| `admin` in `profiles_role_check` | Yes (`farmer` / `vet` / `admin`) |
| `profiles.email`, `profiles.house_id` | Yes |
| Table `vet_applications` | Yes |
| Table `vet_code_attempts` | **No** |
| Bucket `vet-licenses` (private) + 3 storage policies | Yes |
| Function `submit_vet_application` | Yes (EXECUTE still granted to authenticated) |
| Function `review_vet_application` | Yes |
| Trigger `protect_profile_role` with `moo.allow_role_change` | Yes |
| Policy `vet_app owner insert` | Yes (clients could still INSERT) |
| `animals_public` | Live order already correct; notes/reminders owner-only; vaccinations/health owner-or-vet |

Cause of `ERROR: 42P16: cannot change name of view column "notes" to "tag_number"`: `schema-v4-vet-code.sql (file later removed or moved, see README migration table)` previously recreated `animals_public` with a different column order. That failed run did not leave a broken view (live def matched the safe order).

---

## 2. SQL file fixes (repo)

- `schema-v4-vet-code.sql (file later removed or moved, see README migration table)` — `CREATE OR REPLACE VIEW public.animals_public` rewritten to the **exact** live column order with owner-only `notes`/`reminders` and owner-or-vet `vaccinations`/`health`.
- `tests/rls-fixes-proposed.sql` — same view order/masks (so a re-run cannot reopen the leak or hit 42P16) (file later removed or moved, see README migration table).
- `schema-v3-auth.sql (file later removed or moved, see README migration table)` — comment only (still does not recreate the view).

---

## 3. What was applied now

1. Migration `schema_v3_auth` (idempotent re-apply of `schema-v3-auth.sql (file later removed or moved, see README migration table)`).
2. Migration `schema_v4_vet_code` (`schema-v4-vet-code.sql (file later removed or moved, see README migration table)` with fixed view).
3. Edge Function `submit-vet-application` deployed (ACTIVE, version 1, `verify_jwt=true`) via Supabase MCP (CLI was not installed locally).

### Post-apply confirmation

| Check | Result |
|---|---|
| `vet_applications` | Exists |
| `vet_code_attempts` | Exists; RLS on; **0** policies for anon/authenticated |
| `submit_vet_application` | **Dropped** (clients cannot call it) |
| `review_vet_application` | Exists; EXECUTE for authenticated; body requires `role = 'admin'` |
| `vet_applications` policies | `vet_app owner read`, `vet_app admin update` only — **no** client INSERT |
| `moo.allow_role_change` | Present in `protect_profile_role` |
| Bucket `vet-licenses` | Private; own upload/read + admin read |
| `animals` / `vaccinations` SELECT | Narrowed owner-or-vet policies unchanged |

---

## 4. Final live `animals_public`

```sql
 SELECT id,
    owner_id,
    name,
    type,
    breed,
        CASE
            WHEN owner_id = auth.uid() THEN notes
            ELSE NULL::text
        END AS notes,
    photo,
    fingerprint,
    frame_count,
        CASE
            WHEN owner_id = auth.uid() THEN reminders
            ELSE NULL::jsonb
        END AS reminders,
    tag_number,
    created_at,
        CASE
            WHEN owner_id = auth.uid() OR (EXISTS ( SELECT 1
               FROM profiles p
              WHERE p.id = auth.uid() AND p.role = 'vet'::text)) THEN vaccinations
            ELSE '[]'::jsonb
        END AS vaccinations,
        CASE
            WHEN owner_id = auth.uid() OR (EXISTS ( SELECT 1
               FROM profiles p
              WHERE p.id = auth.uid() AND p.role = 'vet'::text)) THEN health
            ELSE '[]'::jsonb
        END AS health
   FROM animals a;
```

Column order: id, owner_id, name, type, breed, notes, photo, fingerprint, frame_count, reminders, tag_number, created_at, vaccinations, health.

---

## 5. Tests

| Suite | Result | Notes |
|---|---|---|
| `node --test tests/unit/*.test.js` | **Pass** (29/29) | |
| `node tests/rls/rls.mjs` | **Pass** — `critical=[]` | Direct INSERT blocked; old RPC gone; notes/reminders null for neighbour |
| `node tests/e2e/demo.mjs` | **Pass** | Vet code field present; offline map no mirror |

### RLS items that stayed “not run”

| Id | Reason |
|---|---|
| `8-edge-wrong-code` | `VET_INVITE_CODE` not set in test env |
| `8-edge-rate-limit` | same |
| `8-edge-correct-code` | same |

(Also SKIP: vet-role slots / verify without durable vet via service_role — unchanged.)

Nothing failed that was expected to pass after v4.

---

## 6. Admin promote

Prompt email was still the placeholder `<<<PUT YOUR EMAIL HERE BEFORE SENDING>>>`.  
No admin promote was done. Sign up with your real email first, then ask again.

---

## 7. Still open (needs you)

1. Turn off “Confirm email” if it is still on.  
2. Set dashboard secret `VET_INVITE_CODE`.  
3. Sign up; reply with that email for admin promote.  
4. Phone smoke test.

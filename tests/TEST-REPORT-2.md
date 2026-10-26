# Moo — test report 2 (auth, vet verification, map)

Date: 2026-10-24  
Project: Supabase Moo (`rvhhmpnpggtfufwpgdaw`). No secrets in this report.  
Migration `schema-v3-auth.sql (file later removed or moved, see README migration table)` is **written but not applied** (waiting for Eva).

Veterinarians receive an individual access code and their applications are reviewed manually by the project owner. This process stays manual until the project receives funding.

---

## 1. Summary (three lines)

1. **Auth gate works in the app:** first screen is Sign in / Sign up / Try demo; demo keeps the role switch; real accounts hide it and show a personal cabinet with Sign out.  
2. **Critical RLS still green** after the client changes; vet-application checks are ready but marked “not run” until you apply `schema-v3-auth.sql (file later removed or moved, see README migration table)` (and promote an admin via SQL).  
3. **Offline map mirror is fixed** in the service worker (`moo-v25`): iframe requests no longer fall back to `index.html`; e2e `4-offline-map-no-mirror` passed.

---

## 2. Results table

| Suite | Result | Notes |
|---|---|---|
| `node --test tests/unit/logic.test.js` | **Pass** (20/20) | Unchanged core logic |
| `node --test tests/unit/auth.test.js` | **Pass** (9/9) | Role resolution, app status transitions, overlay leak guard |
| `node tests/rls/rls.mjs` | **Critical green** | 1 / 1b / 3 / 4 / 7 pass; section 8 skipped until schema-v3 |
| `node tests/e2e/demo.mjs` | **Pass** (smoke) | Try demo → farmer/vet flow; offline shell + no map mirror; i18n parity fixed |

### RLS section 8 (vet applications) — after you apply schema-v3

| Check | Status |
|---|---|
| Farmer submits application | Ready (runs when RPC exists) |
| Farmer cannot read another’s application | Ready |
| Farmer cannot self-approve | Ready |
| Farmer cannot set `role` to vet/admin | Ready |
| Farmer cannot read another’s license object | Ready |
| Admin approve + new vet creates slots / verifies | **Not run** — no service_role in client tests; needs SQL promote + `MOO_ADMIN_READY=1` |

---

## 3. Bugs found

| Bug | Severity | Fix |
|---|---|---|
| No real sign-up/login; auto-demo boot | High | Auth screen + Supabase email/password |
| Hard-coded vet browser path / always-on role switch | High | `DEMO_ROLE_SWITCH` only when `moo_demo_mode=1` |
| Offline SW served `index.html` into map iframe (“mirror tunnel”) | High | Navigate fallback only for top-level; precache `three.min.js`; iframe recursion guard |
| Vet Map tab showed duplicate SVG + 3D | Medium | Statuses/outbreaks on 3D via `moo:overlay`; SVG only if WebGL missing |
| i18n multiline keys failed parity audit | Low | Collapsed to single-line entries |

---

## 4. What I fixed

- `schema-v3-auth.sql (file later removed or moved, see README migration table)` — `admin` role, `vet_applications`, storage `vet-licenses`, `submit_vet_application` / `review_vet_application`, updated `protect_profile_role` with `moo.allow_role_change`
- Auth UI, farmer onboarding, pending-vet banner, admin approval screen
- Personal cabinet (name, email, role, house, animals, points, rank, sign out)
- Map `postMessage` protocol; outbreak legend under 3D map
- SW `moo-v25`, unit/RLS/e2e updates

---

## 5. What you must decide / run

1. **Apply** `schema-v3-auth.sql (file later removed or moved, see README migration table)` in the Supabase SQL editor (do not apply from the agent).  
2. **Dashboard → Authentication → Providers → Email:** disable “Confirm email” for the demo.  
3. **Create the first admin** after that user signs up:
   ```sql
   select id, name, email, role from public.profiles order by created_at desc;
   update public.profiles set role = 'admin' where id = '<uuid>';
   ```
   (SQL editor bypasses the authenticated branch of `protect_profile_role`.)  
4. Optional: set `MOO_ADMIN_READY=1` and re-run RLS after an admin exists if you extend the script with a service key later.  
5. **Real outbreak entry by the vet** is still the next product step (demo outbreaks remain constants in `vet.js`).

---

## 6. Manual checks on a real phone (HTTPS)

- [ ] Fresh install → auth screen → Sign up as farmer → onboarding → cabinet greeting uses real name  
- [ ] Sign out → Sign in  
- [ ] Sign up as vet with license photo → “under review” banner; farmer-level access only  
- [ ] Admin approves → vet sees vet cabinet (reload or realtime)  
- [ ] Airplane mode after one online visit → Map tab: shell + cached 3D or placeholder — **never** nested app  
- [ ] Vet map: coloured houses + pulsing outbreaks; tap house → sheet; filters dim houses  
- [ ] Farmer map: no status colours, no outbreak markers  
- [ ] Demo button still toggles farmer ↔ vet in the header  

---

## How to re-run

```bash
cd /Users/diana/Documents/GitHub/Build-with-AI-BASICS
node --test tests/unit/logic.test.js tests/unit/auth.test.js
cd tests && node rls/rls.mjs
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node e2e/demo.mjs
```

# Moo — test report 3 (vet invite code + wording)

Date: 2026-10-24  
Project: Supabase Moo (`rvhhmpnpggtfufwpgdaw`). No secrets in this report.

Veterinarians receive an individual access code and their applications are reviewed manually by the project owner. This process stays manual until the project receives funding.

---

## 1. Summary (three lines)

1. **Wording** no longer mentions a “village administration”; the app says the Moo team reviews applications.  
2. **Vet applications** are submitted only through the Edge Function `submit-vet-application` (invite code in server secret `VET_INVITE_CODE`); the old RPC is revoked in `schema-v4-vet-code.sql (file later removed or moved, see README migration table)`.  
3. **Unit tests pass**; RLS critical checks stay green; Edge Function / correct-code checks are **not run** until you apply v4, deploy the function, and set `VET_INVITE_CODE` for the test process.

---

## 2. Results table

| Suite | Result | Notes |
|---|---|---|
| `node --test tests/unit/logic.test.js tests/unit/auth.test.js` | **Pass** | Includes vet-code error key mapping |
| `node tests/rls/rls.mjs` | **Critical green** | Notes/reminders + Edge checks skip until schema-v4 + env |
| `node tests/e2e/demo.mjs` | **Pass** (expected) | Asserts `#authVetCode` on vet sign-up; Try demo still works |

### New / updated RLS checks

| Id | Status |
|---|---|
| `8-neighbour-notes-reminders-null` | **Pass** (`notes=null reminders=null` for neighbour) |
| `8-farmer-no-direct-insert-app` | **Fail until v4** — client INSERT still allowed (owner insert policy from v3) |
| `8-old-rpc-revoked` | **Fail until v4** — RPC still executable before revoke/drop |
| `8-edge-wrong-code` / `8-edge-rate-limit` / `8-edge-correct-code` | **Not run** — `process.env.VET_INVITE_CODE` unset |
| `8-farmer-no-read-other-app` / license | **Pass** |

---

## 3. Bugs found / fixed in this pass

| Item | Fix |
|---|---|
| “Village administration” copy | Replaced with Moo team review wording (ru/ky/en) |
| Client could call `submit_vet_application` RPC | Revoked/dropped in schema-v4; app calls Edge Function |
| Client INSERT on `vet_applications` | Policy removed in schema-v4 |
| Demo string `VET-2026` in product docs | Removed from README, architecture, prd, scope, spec, checklist, TEST-REPORT-2 (prompt files left untouched per rule) |

---

## 4. Search commands and results (hygiene)

```bash
cd /Users/diana/Documents/GitHub/Build-with-AI-BASICS
rg -n 'VET-2026' --glob '!tests/node_modules/**' --glob '!.git/**'
rg -n -i 'village admin|village administration|администрация села|айыл администра' --glob '!tests/node_modules/**' --glob '!.git/**'
rg -n 'VET_CODE\s*=' --glob '!tests/node_modules/**'
```

Results after cleanup:

- `VET-2026` remains only in **prompt files** (not edited per instruction): `agent-prompt-v2.md`, `moo-kit-v2/AGENT-PROMPT.md` (they instruct removing the code; they are not product UI) (file later removed or moved, see README migration table).  
- No “village administration” matches left in `app/`.  
- No `VET_CODE =` assignment in app code.

---

## 5. What you must run (order)

1. Apply `/Users/diana/Documents/GitHub/Build-with-AI-BASICS/schema-v3-auth.sql (file later removed or moved, see README migration table)` if not already applied.  
2. Apply `/Users/diana/Documents/GitHub/Build-with-AI-BASICS/schema-v4-vet-code.sql (file later removed or moved, see README migration table)`.  
3. Set Edge Function secret `VET_INVITE_CODE` in the Supabase dashboard (value never committed).  
4. Deploy the Edge Function.  
5. Re-run tests with `VET_INVITE_CODE` in the environment for Edge checks.

Exact deploy / secret steps are in the agent’s final message.

---

## 6. Manual phone checks

- [ ] Vet sign-up shows “Vet access code” + license fields  
- [ ] Wrong code → clear localized error; no automatic “verified” claim  
- [ ] After approval by `admin`, next login shows vet cabinet  
- [ ] Demo button still works without a code  

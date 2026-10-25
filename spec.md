---
doc: spec
status: approved
---

# Moo — Technical Spec

## How This Works, In Plain Language

Moo is a PWA (no build step). Users hit an auth screen, then a farmer or vet cabinet. Animals and vaccinations live in Supabase Postgres with RLS (localStorage fallback). Farmers book slots through SQL `book_slot`. The vet marks a booking done; that writes a `verified` vaccination; rewards (`app/rewards.js`) grant trophies only for verified records. Muzzle recognition uses MobileNet embeddings in the browser. The 3D map runs in an iframe and receives vet-only overlays by `postMessage`.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

- Open → `renderAuth` (welcome + Sign in / Sign up / Try demo).
- Sign up farmer → profile `role=farmer` → optional onboarding → Home.
- Sign up vet → Edge Function `submit-vet-application` inserts `vet_applications` after checking the invite secret → admin `review_vet_application` sets `profiles.role=vet`.
- Book → UI `confirmBook` → `store.bookSlot` → RPC `book_slot` → booking + queue number.
- Vet Vaccinated → `vDone` → `applyVerifiedVaccination` (status `verified`) → `runRewards` / activity points → green status + trophy.
- Scan → `fingerprintOf` + `findMatch` → owner + `animalStatus`.
- Map → iframe `village-map.html`; `buildMapOverlay` sends statuses/outbreaks only when role is vet.

## Auth and roles

PRD ref: `prd.md > Auth and roles`.

- Supabase Auth email/password; `app/store.js` `signIn` / `signUp`; session restore on boot.
- `profiles.role`: farmer | vet | admin (`schema-v3-auth.sql`). Trigger `protect_profile_role` blocks client self-promotion; admin promote via SQL editor or `review_vet_application` with `moo.allow_role_change`.
- Vet apply: license upload to Storage `vet-licenses`; code checked only in the Edge Function against a server-side invite secret (a special code is issued by the project owner — never stored in the client or in docs). Rate limit table `vet_code_attempts` (`schema-v4-vet-code.sql`).
- Demo: `moo_demo_mode`; role switch only then (`app/vet.js`).

## Booking and queue

PRD ref: `prd.md > Booking and queue`.

- Tables `slots`, `bookings` + function `book_slot` (`schema-v2.sql`).
- Client: `getSlots`, `createSlot`, `bookSlot`, `updateBooking` in `app/store.js`; pure helpers in `app/logic.js`.

## Vet cabinet

PRD ref: `prd.md > Features and Behavior` (Vet cabinet). Source: `navVet()` / `vDone` / cast / chats in `app/app.js`.

## Stack

- Vanilla HTML/CSS/JavaScript (ES modules). No build step.
- TensorFlow.js + MobileNet v2 (CDN) for recognition.
- Supabase Auth + Postgres + Storage + Edge Functions.
- Three.js (`app/three.min.js`) in `village-map.html`.
- PWA: `manifest.webmanifest` + `sw.js` (registered on boot; cache `moo-v30`).
- Run: any static server from `app/`.

## Where It Runs and How Someone Tries It

- Phone or desktop browser; camera + internet on first load (model, Supabase).
- Start: `cd app && python3 -m http.server 8000 --bind 127.0.0.1`, open `http://localhost:8000`.
- First screen is auth; use **Try demo** for a seeded farm without an account, or Sign up / Sign in.
- DB: apply `schema-v2.sql`, then `schema-v3-auth.sql`, then `schema-v4-vet-code.sql`; put URL + anon key in `app/supabase-config.js`; deploy Edge Function `submit-vet-application`; promote admin via SQL. A special vet access code is issued by the project owner (server secret).

## Components

- `app/app.js` — routing, cabinets, auth UI, booking, `vDone`, welcome block.
- `app/store.js` — Supabase + localStorage; `animals_public` reads; booking; vet applications.
- `app/auth-logic.js` — `resolveAppRole`, overlay builder, demo flag.
- `app/rewards.js` — trophies/reminders for verified only; `applyVerifiedVaccination`.
- `app/logic.js` — status, points, booking pure functions.
- `app/recognition.js` — embeddings, species gate, matching constants.
- `app/vet.js` — demo role switch, outbreak demo data, map overlay send.
- `app/mock.js`, `app/camera.js`, `app/i18n.js`, `app/supabase.js`, `app/sw.js`.
- Schemas: `schema-v2.sql`, `schema-v3-auth.sql`, `schema-v4-vet-code.sql`; function `supabase/functions/submit-vet-application/`.

PRD refs: `prd.md > Features and Behavior`, `prd.md > Auth and roles`.

## Data Model (Supabase)

- `profiles` — id, name, phone, email, address, house_id, **role** (`farmer`|`vet`|`admin`), created_at.
- `animals` — passport fields + fingerprint jsonb + vaccinations/health/reminders jsonb; clients **read via `animals_public`**.
- `animals_public` — view masking neighbour `notes`/`reminders`; `vaccinations`/`health` only for owner or vet (`schema-v4-vet-code.sql`).
- `vaccinations` (table and/or jsonb history) — status `claimed` | `verified`; points trigger on verify (`schema-v2.sql`).
- `slots`, `bookings` — capacity, queue_no; `book_slot` RPC.
- `vet_applications`, `vet_code_attempts`; Storage bucket `vet-licenses`.
- `posts`, `messages` (private threads), `activity_log` / points as implemented in schema-v2.

RLS: owners write own rows; role changes blocked for clients; vet verify paths restricted; anon denied sensitive reads. Critical holes found by `tests/rls/rls.mjs` / `tests/TEST-REPORT.md` (self-promote vet; neighbour vaccination leak) and fixed.

## File Structure

```
app/                 # PWA
schema-v2.sql … v4   # migrations
supabase/functions/  # submit-vet-application
tests/               # unit, rls, e2e
scope.md prd.md spec.md
devpost/             # pack workspace (copies of planning docs + checklist + app-map)
```

## Recognition Constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `MATCH_THRESHOLD` | 0.53 | cosine similarity for "found it" |
| `MATCH_MARGIN` | 0.05 | best must beat runner-up |
| `SPECIES_CONFIDENCE` | 0.35 | trust species label |
| `FRAMES_TO_CAPTURE` | 3 | frames averaged at registration |

Source: `app/recognition.js`; measured with `tools/calibrate.html`.

## Important Failure Modes

- Camera denied → upload / demo-scan fallback.
- Model offline → loading / retry.
- No match → feed offer.
- Supabase down → localStorage fallback.
- Offline map → placeholder / cached assets; never nest full app in iframe (SW fix).
- Wrong/missing vet code → Edge Function errors mapped to i18n (`authWrongVetCode`, rate limit).

## What Was Simplified and Why

- MobileNet classifier as muzzle embedding stand-in — no free animal Face-ID API.
- Outbreaks as constants in `vet.js` — DB table + RLS later.
- Vet access codes issued and applications reviewed manually by the project owner until funding — not an automated agent.
- Animal photos often as data URLs — Storage later (licenses already on Storage).
- Push: SW stub only — no production push server yet.

## Decisions and Open Issues

- Roles live in `profiles.role` (not `is_vet` / localStorage for real accounts).
- Trophies only for `verified`.
- Telegram login dropped.
- Still open: admin promote for a real owner account; dashboard secret for invite code; phone smoke checklist in test reports.

---
doc: prd
status: approved
---

# Moo — Product Requirements

One line: Moo is a livestock-biosecurity PWA — digital vet passports, FMD vaccination deadlines with reminders, booking with the village vet, trophies only for vet-confirmed vaccinations, and a private chat with the vet. Source: `scope.md`.

## The Core Journey

1. Open Moo → **auth screen** (Sign in / Sign up / Try demo) with a compact "What is Moo?" welcome.
2. Enter as farmer (account or demo) → Home shows animals with FMD status badges (green / yellow / red).
3. Book a vaccination slot → pick animals → receive a **queue number**.
4. Vet opens Today → sees the queue → marks **Vaccinated** → animal becomes protected and the farmer gets a **trophy + points** (verified only).
5. Reminders at 30 / 7 / 1 days before the next deadline; a lapsed vaccination loses the trophy.
6. Optional: scan a muzzle → owner + FMD status; chat privately with the vet; use Feed / Map / Rating.
7. Vet Map: house vaccination statuses + outbreak markers; farmer Map: village 3D without those overlays.

Implements: `scope.md > The Core Loop`. Source: `app/app.js` (`renderAuth`, `confirmBook`, `vDone`), `app/rewards.js`.

## Auth and roles

- Everyone signs up the same way (email + password). "Try demo (no account)" seeds a local demo farm.
- On Sign up, choose farmer or veterinarian. Vets additionally submit a license photo and an **individual access code** issued by the project owner. Applications go to `vet_applications` via Edge Function `submit-vet-application`; the owner (admin) reviews them manually until the project receives funding. Pending vets use the farmer cabinet with an under-review banner.
- Roles: `farmer` | `vet` | `admin` on `profiles.role`. Demo role switch farmer↔vet appears only in demo mode.

Implements: `scope.md > POC Boundary` (auth / roles). Source: `app/app.js`, `app/store.js`, `schema-v3-auth.sql`, `schema-v4-vet-code.sql`, `supabase/functions/submit-vet-application/`.

## Booking and queue

- Vet opens reception slots (day, time, place, capacity, disease).
- Farmer books from Feed/Home → selects animals → `book_slot` assigns a queue number under capacity.
- Farmer sees "my booking"; can cancel. Vet marks done or no-show.

Implements: `scope.md > The Unique Kernel`. Source: `app/store.js` (`bookSlot`), `schema-v2.sql` (`book_slot`), `app/logic.js`.

## Screens and Layout

- **Auth** — logo, tagline, "What is Moo?" card, Sign in / Sign up tabs, form, Try demo; language + day/night in the top bar.
- **Farmer:** Home, Animals, Feed, Chat, Map, Rating (+ profile, camera/register sheets).
- **Vet:** Today (queue), Map, Broadcasts, Chats, Stats (+ profile).
- **Admin:** pending vet applications (approve / reject).
- **Find (scan)** — camera + Scan; plaque shows owner + status (reached from animal flows).
- **Trophies** — shelf with rank, reminders, lost trophies (farmer rating / rewards views).

## Look and Feel

Glassmorphism over painted meadow backdrops. Big rounded controls, status colors green / yellow / red. i18n: Russian (default), Kyrgyz, English; light + dark theme.

## Features and Behavior

### Vet passport
Per animal: photo(s), ear tag, vaccination history, next re-vaccination, health journal. Implements: `scope.md > POC Boundary`.

### Vaccination status (FMD)
Green = protected, yellow = soon, red = overdue / urgent; also `never` and `claimed` (self-mark, not verified). Shown on cards and the scan plaque. Source: `app/logic.js` → `animalStatus`.

### Booking
See **Booking and queue**.

### Rewards
Trophies and points **only** for vaccinations with `status = verified` (vet confirmed). Self-mark is `claimed` and awards 0 points. Reminders at 30 / 7 / 1 days; trophy lost when validity lapses. Source: `app/rewards.js`, `app/logic.js` → `pointsForVaccinationRecord`.

### Vet cabinet
Queue with Vaccinated / No-show; map overlays; broadcast segments; farmer chats; village stats. Source: `navVet()` in `app/app.js`.

### Private vet chat
Farmer↔vet threads; vet inbox of farmer threads. Village-wide chat removed.

### Feed
Categorized posts (including slot cards to book).

### Muzzle recognition
Register with averaged frames; scan matches by cosine similarity with species gate, threshold + margin. Source: `app/recognition.js`.

### Map
3D village map in an iframe. Vet sees house statuses + demo outbreaks; farmers do not. Offline: shell/cache after first load; map needs a connection the first time; SW must not inject the app into the map iframe.

## States and Boundaries

- Auth screen first; demo is opt-in via Try demo.
- Supabase missing / unhealthy → localStorage fallback + demo data.
- Camera denied → upload / demo-scan fallback.
- No match → offer to publish to the feed.
- Neighbour animal private fields hidden via `animals_public` + RLS.

## Product Decisions

- **PWA, not native.**
- **Supabase (free tier)** for Auth + Postgres (RLS); localStorage fallback.
- **Name "Moo".**
- **Everyone signs up by email the same way;** vets additionally apply with a license and an individual code; the project owner reviews applications manually until funding.
- **Trophies only for vet-confirmed (`verified`) vaccinations.**
- **Telegram login was dropped.**
- Demo village name stays in existing UI copy only; new docs stay generic ("your village", "the village vet").

## What We're Building

The full core loop above: auth + roles, passports, statuses, booking/queue, vet confirmation → trophies, cabinets, map, feed, recognition, glass, i18n, PWA.

## Non-Goals

Payments / marketplace, breeding analytics, Bluetooth, native app, automated vet-code issuance, offline chat, full push notification backend, Storage for every photo.

## Later / Deferred

Native app; offline chat; admin agent that issues vet codes; push notifications; Supabase Storage for all photos; outbreaks table; offline recognition; more species.

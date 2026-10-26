---
doc: scope
status: approved
---

# Moo

One line: a livestock-biosecurity PWA for a village — digital vet passports, Foot-and-Mouth (FMD) vaccination deadlines with reminders, booking with the village vet, trophies only for vet-confirmed vaccinations, and outbreak awareness on a map (vet only).

## The Unique Kernel

A village-wide biosecurity layer: every animal has a **vet passport** and an **FMD status** at a glance (green / yellow / orange / red / grey). Farmers **book a visit** with the village vet and see their **queue number**. The vet **confirms** the vaccination; only then do **trophies and points** appear. Farmers chat privately with the vet; only the vet sees **outbreak markers** on the map.

## Who It's For

Smallholders and the village veterinarian. Villagers need deadlines, reminders, and a way to book and reach the vet; the vet needs a queue, map statuses, broadcasts, and chats in one place. An admin (project owner) reviews vet applications until funding allows automation.

## The Core Loop

Sign in (or Try demo) → see animals with FMD statuses → book a slot → get a queue number → vet marks vaccinated → status turns green and a trophy is earned → reminders at 30 / 7 / 1 days before the next deadline. (Optional: muzzle scan to identify an animal + owner.)

## What "Working" Looks Like

Auth screen with a short "What is Moo?" welcome. Demo or real account opens a farm with green / yellow / orange / red badges (demo seeds four fictional animals). Booking produces a queue place. Vet Vaccinated sets `verified` and awards a trophy. Vet map shows house statuses on real footprints (demo) and outbreak pins; farmer map does not.

## POC Boundary (frozen)

In:

- Auth gate: email/password Sign in / Sign up for everyone, plus Try demo; collapsible welcome block on the auth screen.
- Roles in `profiles.role`: farmer / vet / admin; vet application (license photo + individual access code issued by the project owner) via Edge Function `submit-vet-application`; admin reviews manually (`supabase/sql/003_auth_roles_vet_applications.sql`, `supabase/sql/004_vet_code_and_masking.sql`).
- Digital vet passport: ear tag, vaccination history, next re-vaccination, health journal.
- FMD status badges (green / yellow / orange / red / grey); reminders at 30 / 7 / 1 days.
- Vaccination slots, `book_slot` queue numbers, vet confirmation (`verified`); trophies/points only for verified (`supabase/sql/002_booking_vaccinations.sql`).
- Farmer cabinet tabs: Home, Animals, Feed, Chat, Map, Rating.
- Vet cabinet tabs: Today (queue), Map, Broadcasts, Chats, Stats.
- Private vet chat; categorized feed; muzzle recognition (honest matching + species gate).
- 3D village map; vet-only overlays; demo map pins on real house footprints; glass UI; i18n (ru / ky / en); PWA service worker.
- Privacy: RLS + `animals_public` masking private neighbour fields.
- Hosted on Vercel (static `app/`); unit / RLS / Playwright tests under `tests/`.

## Later

- Native app.
- Offline chat.
- Admin assistant agent that issues vet access codes (today: project owner issues codes and reviews applications manually until funding).
- Real push-notification server (SW has a reminder push stub only).
- Supabase Storage for all animal photos (license photos already use the `vet-licenses` bucket).
- Outbreaks as a database table with vet-only RLS (today: demo constants in `vet.js`).
- Offline on-device recognition model; more species.

## Explicitly Cut

- True "Face ID" magic — approximated with MobileNet + honest matching.
- Farmer self-mark earning trophies (self-mark is `claimed` only; no points).
- Telegram login.
- Payments, marketplace, breeding/genetics analytics, Bluetooth.

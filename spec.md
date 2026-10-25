---
doc: spec
status: approved
---

# Moo — Technical Spec

## How This Works, In Plain Language

Moo is a PWA (no build step). MobileNet v2 turns a muzzle close-up into a 1280-number embedding; registration averages 3–5 frames; scanning matches by cosine similarity with a species gate + threshold + margin. Vet passports, vaccination statuses, rewards, and private vet chat live in Supabase Postgres (RLS) with a localStorage fallback.

## The Core Journey Through the System

- Open → seeded demo farm (localStorage) or Supabase data.
- Register → capture N frames → MobileNet infer → average → save animal + fingerprint + tag + vaccinations + health.
- Scan → infer + classify → filter by species → cosine rank → threshold + margin → owner + FMD status, or "not found → feed".
- Vaccinate → append a vaccination record (disease, date, validUntil) → rewards recompute (earned / renewed / remind / lost).
- Chat → messages carry a `thread` (village or farmer id); farmers see their own thread, the vet sees all.
- Vet role → `profiles.role = 'vet'` after manual review → outbreak markers render only for the vet.

## Stack

- Vanilla HTML/CSS/JavaScript (ES modules). No build step.
- TensorFlow.js + MobileNet v2 (CDN).
- Camera/audio: `getUserMedia` + `MediaRecorder`.
- Storage: Supabase Postgres (RLS) with localStorage fallback.
- Three.js 3D village map (local three.min.js) in an iframe.
- PWA: manifest + service worker (unregistered by default).
- Run with any static server (`python3 -m http.server`).

## Where It Runs and How Someone Tries It

- Phone or desktop browser; camera + internet on first load.
- Start: `cd app && python3 -m http.server 8000 --bind 127.0.0.1`, open `http://localhost:8000`.
- DB: run `supabase/schema.sql`; put URL + anon key in `app/supabase-config.js`; set `is_vet` for the vet.
- Demo: "Try demo" opens a seeded farm; real vet access uses an invite code reviewed by the project owner.

## Components

- `app/store.js` — Supabase (RLS) data layer + localStorage fallback.
- `app/recognition.js` — model, embeddings, species gate, matching.
- `app/rewards.js` — trophies, reminders, lost trophies (pure evaluate + UI).
- `app/vet.js` — vet role flag + outbreak markers.
- `app/mock.js` — demo data (vet, alerts, map points, demo farm).
- `app/supabase.js`, `app/camera.js`, `app/app.js`, `app/i18n.js`.
- `app/glass.css` + `app/img/` — glass design layer and backdrops.

## Data Model (Supabase)

- `profiles` — id, name, phone, address, is_vet, created_at.
- `animals` — id, owner_id, name, type, breed, notes, tag_number, photo, fingerprint (jsonb), frame_count, vaccinations (jsonb), health (jsonb), reminders (jsonb), created_at.
- `posts` — id, user_id, photo, note, type, category, location, comments (jsonb), created_at.
- `messages` — id, sender_id, text, audio, thread, created_at.

RLS: profiles readable by signed-in, writable by self; animals/posts readable by signed-in, writable by owner; messages — the village thread is readable by signed-in, private threads are readable only by the farmer and any `is_vet` account.

## Recognition Constants (measured on animal muzzle photos)

| Constant | Value | Meaning |
| --- | --- | --- |
| `MATCH_THRESHOLD` | 0.53 | cosine similarity for "found it" |
| `MATCH_MARGIN` | 0.05 | best must beat runner-up by this |
| `SPECIES_CONFIDENCE` | 0.35 | classify score to trust the species |
| `FRAMES_TO_CAPTURE` | 3 | frames averaged at registration |

Source: `tools/calibrate.html` on real cow/livestock photos (6 same cow + 5 other animals); genuine min 0.519 / impostor max 0.521 (near-touch). Shipped threshold 0.53 (above impostor max). Details in `README.md`.

## Important Failure Modes

- Camera permission denied → friendly message + upload fallback.
- Model not loaded / offline → loading state + retry.
- No match / below threshold → "not found" → offer to post to the feed.
- Species mismatch → advisory warning at registration; species filter at scan.
- Supabase tables missing → automatic localStorage fallback + demo data.
- Vet chat: farmers see only their own thread (RLS).

## What Was Simplified and Why

- MobileNet (a classifier) as a stand-in for a face-ID model — no free animal face-ID service exists.
- Outbreak markers are demo data in `vet.js` (not a table) — move to a table + RLS for production.
- Vet role is a localStorage flag / demo code in the POC — store `is_vet` in `profiles` + RLS for production.
- Photos as data URLs in Postgres (`text`) — move to Supabase Storage later.

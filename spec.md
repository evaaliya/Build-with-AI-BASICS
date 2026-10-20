---
doc: spec
status: approved
---

# Moo — Technical Spec

## How This Works, In Plain Language

MobileNet v2 (TensorFlow.js) runs in the browser and turns a close-up muzzle/nose-pad image into a 1280-number embedding — its "fingerprint." Registration averages 3–5 frames. Scanning compares by cosine similarity, gated by a species classification and a threshold + separation margin. Data lives in Supabase Postgres with Row Level Security.

## The Core Journey Through the System

- Sign up → Supabase Auth user → `profiles` row (trigger).
- Register → capture N frames → MobileNet `infer` → average → save animal + averaged fingerprint to `animals`.
- Scan → `infer` + `mobilenet.classify` species gate → filter by species → cosine rank → threshold + margin → owner (from `profiles`) or "not found → feed."
- Feed / chat / reminders → read/write Supabase (feed + chat) or the animal row (reminders).

## Stack

- Vanilla HTML/CSS/JavaScript (ES modules). No build step.
- TensorFlow.js + MobileNet v2 (CDN) — free, in-browser.
- Camera/audio: `getUserMedia` and `MediaRecorder`.
- Storage: Supabase Postgres (RLS) with a localStorage fallback.
- PWA: manifest + service worker.
- Run with any static server (`python3 -m http.server`).

## Where It Runs and How Someone Tries It

- Phone or desktop browser; needs camera + internet on first load (model + Supabase).
- Start: `cd app && python3 -m http.server 8000 --bind 127.0.0.1`, open `http://localhost:8000`.
- DB setup: run `supabase/schema.sql`; put URL + anon key in `app/supabase-config.js`.
- Demo: register on phone A, scan on phone B, owner appears; unregistered → feed.

## Components

- `app/store.js` — Supabase (RLS) data layer with localStorage fallback.
- `app/recognition.js` — model load, embeddings, species gate, averaged fingerprint, matching.
- `app/supabase.js` — auth + shared client.
- `app/camera.js`, `app/app.js`, `app/i18n.js`.

## Data Model (Supabase)

- `profiles` — id, name, phone, address, created_at.
- `animals` — id, owner_id, name, type, breed, notes, photo, fingerprint (jsonb, averaged), frame_count, reminders (jsonb), created_at.
- `posts` — id, user_id, photo, note, type, location, comments (jsonb), created_at.
- `messages` — id, sender_id, text, audio, created_at.

RLS: profiles readable by all signed-in, writable by self; animals/posts readable by all signed-in, writable by owner; messages readable/writable by all signed-in (village chat).

## Recognition Constants (defaults — re-measure)

| Constant | Default | Meaning |
| --- | --- | --- |
| `MATCH_THRESHOLD` | 0.88 | cosine similarity for "found it" |
| `MATCH_MARGIN` | 0.06 | best must beat runner-up by this |
| `SPECIES_CONFIDENCE` | 0.35 | classify score to trust the species |
| `FRAMES_TO_CAPTURE` | 4 | frames averaged at registration |

Measure on real photos with `tools/calibrate.html` and record the numbers here and in `README.md`.

## Important Failure Modes

- Camera permission denied → friendly message + upload fallback.
- Model not loaded / offline → loading state + retry.
- No match / below threshold → "not found" → offer to post to the feed (no phone shown).
- Species mismatch → advisory warning at registration; species filter at scan.

## What Was Simplified and Why

- MobileNet (a classifier) as a stand-in for a face-ID model — no free animal face-ID service exists. Its limitation (same-category images cluster together) is documented and measured.
- Full-frame close-up instead of a face-detection crop — the user centers the muzzle in the circle.
- Photos as data URLs in Postgres (`text`) for the POC — move to Supabase Storage later.

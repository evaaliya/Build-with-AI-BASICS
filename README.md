# Moo 🐄

> Livestock biosecurity & digital vet passports for a village — vaccination tracking, a veterinarian hotline, and outbreak awareness.

**Moo** is a mobile-first progressive web app (PWA) that helps smallholders protect their herds. It keeps a **digital vet passport** for every animal (ear tag, vaccination history, next re-vaccination date, milk/expense/illness log), flags **Foot-and-Mouth Disease (Ящур)** vaccination status at a glance (green = protected, yellow = due, red = overdue), gives direct access to a **private chat with the village veterinarian**, rewards on-time vaccination with **trophies**, and shows **outbreak markers** on a village map (vet only).

The UI is a glassmorphism layer over painted meadow backdrops (one per tab). It also keeps the original muzzle-recognition feature: point the camera at an animal's muzzle (nose pad) to identify it and its owner.

Built as a proof of concept for the **Build with AI: Basics** hackathon.

## The 90-second demo

1. Open the app — there is **no login screen**; it opens straight into the app with a seeded demo farm (4 animals with different FMD vaccination statuses).
2. **Find (Найти)** — point at a muzzle and tap Scan → a quick-info plaque shows the owner + FMD vaccination status.
3. **Feed (Лента)** — feed & hay, machinery & herders, quarantine, lost & found.
4. **Chat (Чат)** — private conversation with the village veterinarian, plus broadcast alerts and village health stats.
5. **Trophies (Кубки)** — trophies for vaccination, with reminders at 30 / 7 / 1 days before expiry.
6. **Map (Карта)** — vet clinic + vaccination points; red outbreak markers appear only in vet mode.
7. **My farm (profile)** — animal list and the "I'm the vet" mode (code `VET-2026`).

## Features

- **Digital vet passport** — per animal: photo, ear tag, vaccination history, next re-vaccination date, and a health journal (milk yield, expenses, illness, death).
- **Vaccination status (Ящур / FMD)** — green `Защищён` / yellow `Требуется прививка` / red `Просрочено`, shown on every animal card and on the scan plaque.
- **Private vet chat** — a farmer's "Ветеринар" tab is their own thread (`thread = farmer id`); the vet sees an **Обращения** inbox of all farmer threads. Village chat is no longer shown.
- **Vet hotline & broadcasts** — pinned vet profile with an emergency call button and top-level broadcast alerts (e.g. scheduled FMD vaccination, quarantine).
- **Village health stats** — aggregated suspected-FMD / brucellosis / deaths / vaccinated-this-week counts.
- **Outbreak map (vet only)** — red outbreak markers appear only after the vet role is enabled.
- **Rewards** — trophies for vaccinating animals, reminders at 30 / 7 / 1 days before expiry, and a trophy is lost if a vaccination lapses.
- **Categorized feed** — feed & hay, machinery & herders, quarantine, and lost & found.
- **Muzzle recognition** — register with 3–5 averaged frames; later scans identify the animal and owner (honest matching + species gate).
- **i18n** — Russian (default), Kyrgyz, English; light/dark + glass theme.

## Vet role

The veterinarian role is unlocked with the demo code **`VET-2026`** (`VET_CODE` in `app/vet.js`). Enter it in **My farm → "I'm the vet"**. In local mode this is a `localStorage` flag; for production, store `profiles.is_vet` and gate it with Row Level Security (see the SQL in `supabase/schema.sql`).

## How the recognition works (and how we measured it)

There is no free "animal Face ID" API. Moo uses a **MobileNet v2** model (TensorFlow.js) that runs in the browser and turns a close-up of the muzzle/nose pad into a 1280-number embedding — its "fingerprint." Livestock nose-print has long been used as a biometric, so we ask for a close-up.

- **Registration** averages 3–5 frames into one fingerprint for stability.
- **Species gate** — `mobilenet.classify` labels the image; if it disagrees strongly with the chosen type we warn, and at scan time we only compare against the detected species.
- **Match rule** — cosine similarity must be ≥ **threshold** *and* the best candidate must be ≥ **margin** above the second-best. Below threshold we show no phone and instead offer "publish to feed."

Current shipped thresholds (see `app/recognition.js`):

| Constant | Value | Meaning |
| --- | --- | --- |
| `MATCH_THRESHOLD` | 0.88 | cosine similarity required for "found it" |
| `MATCH_MARGIN` | 0.06 | best candidate must beat 2nd best by this |
| `SPECIES_CONFIDENCE` | 0.35 | `mobilenet.classify` score to trust the species |
| `FRAMES_TO_CAPTURE` | 4 | frames averaged at registration |

These are the shipped defaults. **Tune them against your own data** with `tools/calibrate.html` (load ~10–20 real photos: one group of the same animal, one group of other animals) and paste the measured numbers back here and into `spec.md`.

### What we learned about MobileNet (limitations)

MobileNet is an image **classifier**, not a face-ID/metric model. Its embeddings cluster by *category*, so two different cows can be closer than the same cow under different lighting/angle. We measured this and counter it with (1) a species classification gate, (2) a high similarity threshold, (3) a required margin over the runner-up, and (4) averaging multiple frames. The honest result: it works for a village-scale demo, not for a national registry.

## Tech stack

- Vanilla **JavaScript** (ES modules) — no build step.
- **TensorFlow.js + MobileNet v2** — muzzle embeddings + species classification.
- **Supabase** — Auth + Postgres (RLS) for animals, fingerprints, posts, messages, profiles (optional; see below).
- **Leaflet + OpenStreetMap** — interactive map.
- **PWA** — manifest + service worker (unregistered by default so stale cache never breaks the app).

## Getting started

### Prerequisites

- Python 3 (or any static file server).
- A camera (phone or webcam); internet on first load (model + fonts).

### 1. Run locally

```bash
cd app
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000`. The app opens directly (no login) and seeds a demo farm. To open from a phone on the same Wi-Fi, drop `--bind 127.0.0.1` and visit `http://<your-mac-ip>:8000`.

### 2. (Optional) Supabase for shared data across devices

1. Create a free project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/schema.sql` in the SQL editor — it creates `profiles`, `animals`, `posts`, and `messages` with Row Level Security, plus the private-vet-chat columns (`messages.thread`, `profiles.is_vet`) and their policies.
3. Copy the **Project URL** and **publishable (anon) key** into `app/supabase-config.js`.
4. Assign the vet flag manually: `update public.profiles set is_vet = true where id = '<uuid ветеринара>';`.

If Supabase isn't configured, or its tables are missing, the app **automatically falls back to per-device `localStorage`** and seeds demo data.

## Project structure

```
app/                  # the PWA
├── index.html
├── styles.css        # base design system (AgTech / Nature)
├── glass.css         # glassmorphism layer + per-tab backgrounds (loaded after styles.css)
├── img/              # background photos (home, feed, chat, map, rewards)
├── app.js            # routing, state, features
├── store.js          # Supabase (RLS) + localStorage fallback data layer
├── mock.js           # demo data: vet, alerts, feed categories, map points, demo farm
├── rewards.js        # trophies for vaccination
├── vet.js            # veterinarian role + outbreak markers
├── camera.js
├── recognition.js    # MobileNet embeddings, species gate, matching
├── supabase.js, supabase-config.js
├── i18n.js, houses.js, loader.js
├── manifest.webmanifest, sw.js, icons/
supabase/
└── schema.sql        # Postgres tables + Row Level Security (incl. vet chat)
tools/
├── calibrate.html    # measure threshold/margin on real photos
└── README.md
scope.md, prd.md, spec.md   # canonical planning docs
devpost/              # hackathon learning workspace (app-map, checklist, learner profile)
```

## Scope, limitations, and next steps

Known limitations:

- Photos are stored as data URLs in Postgres (`text`); move to Supabase Storage for scale.
- Recognition is honest but bounded by MobileNet (see above); threshold/margin are defaults to re-measure with `tools/calibrate.html`.
- The veterinarian role is a demo code (`VET-2026`) stored in `localStorage`; use `profiles.is_vet` + RLS for production.
- Outbreak markers and rewards are local demo state; the outbreak coordinates currently live in `app/vet.js` (not in the database).
- The village name shown is **с. Нижний-Чуй**; verify the map center `[43.18807, 74.34209]` in `app/app.js` matches it.

Roadmap: Supabase Storage for photos, offline recognition (on-device model), native app, roles/permissions, real push notifications.

## License

[Apache License 2.0](LICENSE).

# Moo 🐄

> Identify a stray cow, sheep, or horse by its face — and find its owner.

**Moo** is a mobile-first progressive web app (PWA) for a village: point your camera at an animal, and instantly see who owns it, then message them by voice or text. Owners register each animal once by scanning its face; anyone can later scan a stray animal to reach its owner. Unregistered animals are posted to a "is anyone looking for this?" feed.

Built as a proof of concept for the **Build with AI: Basics** hackathon.

## Features

- **Face recognition** — register an animal by scanning its face once; later scans identify the animal and its owner.
- **Accounts** — real email/password sign-up and sign-in (Supabase, free tier), with a local fallback.
- **My animals** — each farmer sees only the animals they own.
- **Lost & found feed** — post a photo of a lost animal and comment on posts.
- **Village chat** — text and voice messages, plus a pinned veterinarian card.
- **Village map** — interactive map with cartoon house markers; a profile address places your own house, and registered vs. unregistered households are distinguished.
- **Reminders** — vaccination, heat cycle, vet visit, and weighing, per animal.
- **i18n** — English, Russian, and Kyrgyz, with light and dark themes.

## How the face recognition works

There is no free "animal Face ID" API. Moo uses an honest stand-in: a **MobileNet** model (via TensorFlow.js) runs in the browser and turns each animal's face into a 1280-number embedding — its "fingerprint" — at registration. Later scans are matched against saved fingerprints by **cosine similarity**; the closest match above a threshold is returned with the owner.

## Tech stack

- Vanilla **JavaScript** (ES modules) — no build step.
- **TensorFlow.js + MobileNet v2** — face embeddings.
- **Leaflet + OpenStreetMap** — interactive map.
- **Supabase** — email/password authentication.
- **PWA** — web app manifest + service worker.
- **`localStorage`** — per-device data (Supabase Postgres is the documented multi-user next step).

## Getting started

### Prerequisites

- Python 3 (or any static file server).
- A camera for scanning (a phone or webcam).
- Internet on first load (to download the MobileNet model).

### Run locally

```bash
cd app
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000` in a browser.

> To also open it from a phone on the same Wi-Fi, drop `--bind 127.0.0.1` and visit `http://<your-mac-ip>:8000`.

### Configure Supabase auth

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy the **Project URL** and **publishable key** into `app/supabase-config.js`.
3. For instant sign-in without a verification email during testing, disable **Authentication → Providers → Email → Confirm email**.

If Supabase isn't configured, the app falls back to local (browser-only) accounts.

## Project structure

```
app/
├── index.html            # single-page shell (all views)
├── styles.css            # earthy light/dark theme
├── app.js                # routing, state, and features
├── store.js              # localStorage data layer
├── camera.js             # camera capture + voice recording
├── recognition.js        # MobileNet embeddings + nearest-neighbor matching
├── supabase.js           # email/password auth
├── i18n.js               # EN / RU / KY translations
├── houses.js             # seed village houses
├── loader.js             # lazy-loads heavy CDN libraries
├── manifest.webmanifest  # PWA manifest
├── sw.js                 # service worker
└── icons/icon.svg
devpost/                  # planning docs (scope, PRD, spec, checklist, app map)
```

## Proof-of-concept scope and limitations

In scope: accounts, register-animal-with-face-scan, scan-to-identify, lost-and-found feed with comments, voice/text chat, reminders, search, village map, i18n, and themes.

Known limitations:

- Data is stored per-device in `localStorage`. Moving to Supabase Postgres is the documented next step for true multi-user sharing.
- The recognition match threshold (`0.6` in `app/app.js`) may need tuning for real-world photos.
- The veterinarian info (`VET` in `app/app.js`) and the seed houses (`app/houses.js`) are placeholder data — replace with real contact details and coordinates.

## Roadmap

- Shared backend (Supabase Postgres) so data is shared across phones.
- Offline recognition (on-device model).
- Native app (app store).
- Roles and permissions (owner vs. resident vs. vet).

## License

[Apache License 2.0](LICENSE).

## Author

Built by [Your name] for Build with AI: Basics.

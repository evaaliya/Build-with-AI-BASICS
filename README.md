# Moo 🐄

Identify a stray cow, sheep, or horse by its face — and find its owner.

Moo is a dead-simple phone app (a PWA) for a village: point your camera at an animal, and instantly see who owns it, then message them (voice or text). Owners register each animal once by scanning its face; anyone can later scan a stray animal to reach its owner. Unregistered animals go to a "is anyone looking for this?" feed.

## How it works

- **Face recognition** — a free in-browser MobileNet model turns each animal's face into a 1280-number "fingerprint"; scanning compares fingerprints by similarity. (There is no free "animal Face ID" API, so this is the honest stand-in.)
- **Storage** — data (animals, feed, chat) lives in the browser's `localStorage` for the POC (zero setup). Accounts are real — see **Authentication** below.

## Run it

```bash
cd app
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://localhost:8000` in your browser. It needs the camera and, on first load, internet (for the AI model).

> To also open it from a phone on the same Wi-Fi, bind to all interfaces instead: `python3 -m http.server 8000` (then visit `http://<your-Mac's-IP>:8000`).

## POC scope

Accounts, register-animal-with-face-scan, scan-to-identify, lost-and-found feed, voice/text chat, reminders, animal search, light/dark theme.

## Authentication (Supabase)

Sign-up and sign-in are **real**, powered by **Supabase** (email + password, free tier). The public config lives in `app/supabase-config.js`. If Supabase isn't configured, the app falls back to local accounts.

Setup: create a project at [supabase.com](https://supabase.com), copy the **Project URL** and **publishable key** into `app/supabase-config.js`, and (for instant login without a verification email) turn off **Authentication → Providers → Email → Confirm email**.

> Data is still stored per-device in `localStorage`. Moving it to Supabase Postgres so animals/feed/chat are shared across phones is the next step.

## Dev notes

- Vanilla JS (ES modules), no build step.
- Planning docs live in `devpost/` (scope, PRD, spec, checklist).

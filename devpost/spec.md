---
doc: spec
status: approved
---

# Moo — Technical Spec

## How This Works, In Plain Language

Moo is a web page that acts like an app. When you open it, a small AI model (MobileNet) already running in your browser turns any animal photo into a list of numbers — its "fingerprint." Registering an animal saves that fingerprint with its name and owner. Scanning compares a new photo's fingerprint to every saved one and finds the closest match. Everything (accounts, animals, messages, reminders) is kept in the browser's own storage, so it works instantly with no server.

## The Core Journey Through the System

- Sign up → the user is saved in the browser's storage.
- Register → the camera captures a photo → MobileNet computes its fingerprint → saved with the animal.
- Scan → capture → fingerprint → compare to all saved fingerprints (cosine similarity) → best match shown if similar enough, else "not found."
- Feed / Chat / Reminders → read and write the browser's storage.

## Stack

- Vanilla HTML/CSS/JavaScript (ES modules). No build step.
- TensorFlow.js + MobileNet v2 (CDN) — free, runs in the browser.
- Camera and audio: `getUserMedia` and `MediaRecorder`.
- Storage: `localStorage`.
- PWA: `manifest.webmanifest` + a service worker.
- Run with any static server (`python3 -m http.server`).

## Where It Runs and How Someone Tries It

- Runs in a phone or desktop browser. Needs the camera and, on first load, internet (for the model CDN).
- Start: `cd app && python3 -m http.server 8000 --bind 127.0.0.1`, then open `http://localhost:8000`.
- Demo: register two or three animals, then scan them again.

## Look and Feel

Earthy greens/creams/browns via CSS variables; light and dark mode; rounded, friendly type; big buttons; camera-first layout.

## Components

- `index.html` — single-page shell.
- `styles.css` — theme and layout.
- `app.js` — routing, views, state, boot.
- `recognition.js` — load MobileNet, compute an embedding ("fingerprint"), match by cosine similarity.
- `camera.js` — camera preview/capture and audio recording.
- `store.js` — local-storage CRUD for users, animals, posts, messages, reminders.

## Data Model

- `users` — id, name, phone, passHash.
- `animals` — id, ownerId, name, type, breed, notes, photo (data URL), fingerprint (array of numbers), createdAt, reminders.
- `posts` — id, userId, photo, note, type, location, createdAt.
- `messages` — id, animalId or postId, from, text, audio (data URL), createdAt.
- `reminders` — id, animalId, kind, date, note.

## File Structure

```
app/
├── index.html
├── styles.css
├── app.js
├── recognition.js
├── camera.js
├── store.js
├── manifest.webmanifest
├── sw.js
└── icons/
    └── icon.svg
devpost/        # Devpost learning workspace
└── ...
```

## External Services and Dependencies

- TensorFlow.js + MobileNet from a CDN (jsdelivr). No keys required. The browser caches the model after first load.
- No other external services in the POC.

## Important Failure Modes

- Camera permission denied → friendly message + fallback to uploading a photo.
- Model not loaded / offline → show a loading state and retry.
- No match → "not found" → offer to post to the feed.

## What Was Simplified and Why

- `localStorage` instead of Firebase — zero setup and verifiable now; Firebase is the documented multi-user swap-in.
- Full-frame embedding instead of face-crop detection — simpler; the user centers the animal's face in the framing circle.

## Decisions and Open Issues

- Fingerprint + nearest-neighbor (cosine similarity) instead of a real face-ID API — because no free animal face-ID service exists.
- Open issue: the similarity threshold needs tuning against real photos during the build.

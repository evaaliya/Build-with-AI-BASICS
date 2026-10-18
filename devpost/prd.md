---
doc: prd
status: approved
---

# Moo — Product Requirements

One line: Moo is a dead-simple phone app (a PWA) that lets anyone in a village identify a cow, sheep, or horse by its face, see who owns it, and message them. Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

1. Villager opens Moo on their phone (a link, or a home-screen icon).
2. They create an account once — name, phone/email, password.
3. Home is camera-first: a big **Scan** button and a framing circle.
4. They point the camera at an animal's face and tap Scan.
5. The app matches the face against registered animals and shows the animal (name, photo, type) **and its owner (name, phone)**.
6. They tap **Message owner** to send a voice or text message about the stray animal.
7. If there's no match, they snap a photo and post it to the feed: "Is anyone looking for this?"
8. Owners register each animal once: name, type, breed, notes, then scan its face once to create its "fingerprint."

## Screens and Layout

- **Sign in / Sign up** — name + phone/email + password.
- **Home / Scan** — live camera with a framing circle and a big Scan button; the match result appears below.
- **Register animal** — form (name, type cow/sheep/horse, breed, notes) + "Scan face" capture.
- **Animals** — searchable list of registered animals; tap one to see its profile and reminders.
- **Feed** — posts of lost/unregistered animals with photos + "is anyone looking for this?"
- **Chat** — messages about lost stock, voice and text.
- **Reminders** — per animal: vaccination, heat cycle, vet visit, weighing (with date + note).

## Look and Feel

Earthy palette — greens, creams, browns — with light and dark mode. Camera-first, big buttons, minimal steps. Rounded, friendly type with large tap targets. Tone is plain, warm, zero jargon. Avoid clutter, tiny text, and techy labels.

## Features and Behavior

### Accounts
Sign up with name + phone/email + password; sign in. Stored locally for the POC; Firebase is the documented multi-user swap-in.

### Register an animal
Form fields: name (required), type (cow/sheep/horse), breed, notes; owner = current user. "Scan face" captures one photo → computes its fingerprint → saves it with the profile.

### Scan to identify
Point camera, tap Scan → capture → fingerprint → compare to all registered fingerprints → show the top match + confidence if similar enough; otherwise "no match" → offer to post to the feed.

### Feed
Post a photo + note ("is anyone looking for this?") with animal type and location.

### Chat
Threaded messages about lost stock — voice (recorded) and text — stored locally.

### Reminders
Per animal: type (vaccination / heat / vet / weighing), date, note.

### Animal list / search
List all registered animals; search by name or type.

## States and Boundaries

- **First use** — no account → sign-up screen.
- **Empty state** — no animals → prompt to register one; empty feed → prompt to post.
- **Persistence** — everything in the browser's local storage (per device) for the POC; survives restart.
- **Camera permission** — required; denial shows a friendly fallback (upload a photo instead).

## Product Decisions

- **PWA, not native** — free, instant, no app store; native later.
- **Local-first storage for the POC** — zero setup and verifiable now; Firebase for real multi-user later.
- **Name "Moo"** — from the learner's "Muu."
- **Earthy, light + dark** — warm rural feel, usable by non-tech-savvy villagers.

## What We're Building

The full Core Journey: accounts, register-with-scan, scan-to-identify, feed, chat (text + voice), reminders, animal list/search, light/dark theme. Face recognition = a free in-browser MobileNet model turning each face into a "fingerprint" (a list of numbers) and matching by similarity.

## Deferred From the POC

- Real multi-user backend (Firebase auth + database + storage) — so villagers on different phones share data.
- Offline recognition (bundling a small model on-device).
- Native app (app store).
- Roles/permissions (owner vs vet vs resident).
- Herd/group management.

## Possible Later Enhancements

- More species (goats, pigs).
- Animal-detection crop for better face focus.
- Push notifications.

## Non-Goals

- Payments / marketplace.
- Breeding / genetics analytics.
- Bluetooth.

## Open Questions

None blocking.

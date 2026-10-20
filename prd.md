---
doc: prd
status: approved
---

# Moo — Product Requirements

One line: a PWA to identify a cow, sheep, or horse by its muzzle, see its owner, and message them. Source: `scope.md`.

## The Core Journey

1. Villager opens Moo and signs in (Supabase Auth, email/password).
2. Home is camera-first: a big **Scan** button and a framing circle.
3. They point the camera at the muzzle/nose pad (close-up) and tap Scan.
4. The app matches against registered animals and shows the animal (name, type) **and its owner (name, phone)**.
5. No confident match → "not found" → tap **Publish to feed** ("Is anyone looking for this?").
6. Owners register each animal: name, type, breed, notes, then 3–5 muzzle frames (averaged into one fingerprint).

## Screens and Layout

- **Sign in / Sign up** — name + phone/email + password.
- **Home / Scan** — live camera with a framing circle and a big Scan button; the result appears below.
- **Register animal** — form (name, type cow/sheep/horse, breed, notes) + multi-frame muzzle capture.
- **Animals** — searchable list of the user's animals.
- **Feed** — posts of lost/unregistered animals with photos and comments.
- *(Chat, map, reminders — implemented but not demoed.)*

## Look and Feel

Earthy palette — greens, creams, browns — light and dark mode. Camera-first, big buttons, minimal steps. Plain, warm, zero jargon.

## Features and Behavior

### Accounts
Sign up with name + phone + email + password (Supabase Auth); a profile row is created in `profiles`.

### Register an animal
Form + muzzle capture: average 3–5 frames into one fingerprint. A MobileNet species gate warns if the selected type disagrees strongly with the image.

### Scan to identify
Capture → fingerprint → species check → cosine match against registered animals. A match must clear a **similarity threshold** and a **separation margin** over the runner-up. Below threshold: no phone shown, instead offer "publish to feed."

### Feed
Post a photo + note + type + location; comment on posts.

### Shared data
Animals, fingerprints, posts, messages, and profiles are in Supabase Postgres with RLS.

## States and Boundaries

- **First use** — no account → sign-up screen.
- **Empty state** — no animals → prompt to register; empty feed → prompt to post.
- **No match** — "not found" → offer to post to the feed.
- **Camera denied** — friendly fallback (upload a photo instead).

## Product Decisions

- **PWA, not native** — free, instant, no app store.
- **Supabase (free tier)** for Auth + Postgres — shared across phones with RLS.
- **Name "Moo"**.
- **Muzzle/nose-print as the biometric** — a long-standing livestock practice, and the honest feature MobileNet can support.

## What We're Building

The full core loop: accounts, register-with-scan, scan-to-identify (honest matching), feed, and shared data. Chat/map/reminders exist but are not demoed.

## Non-Goals

Payments / marketplace, breeding/genetics analytics, Bluetooth.

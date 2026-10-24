---
doc: prd
status: approved
---

# Moo — Product Requirements

One line: Moo is a livestock-biosecurity PWA — digital vet passports, Foot-and-Mouth (FMD) vaccination tracking, a private chat with the village veterinarian, and trophies for on-time vaccination. Source: `scope.md`.

## The Core Journey

1. Open Moo — no login screen; it opens into a seeded demo farm.
2. See animals with FMD status badges (green / yellow / red).
3. Tap an animal for its vet passport (tag, vaccination history, health journal) and mark a vaccination.
4. Scan a muzzle → owner + FMD status.
5. Chat with the vet (private thread); the vet sees an "Appeals" inbox.
6. Earn trophies for on-time vaccination; reminders at 30 / 7 / 1 days.
7. Map: vet clinic + vaccination points; outbreak markers (vet only).

## Screens and Layout

- **Find (scan)** — live camera + framing circle + big Scan button; quick-info plaque shows owner + status.
- **Feed** — categorized feed (feed & hay, machinery & herders, quarantine, lost & found).
- **Chat** — private vet conversation; pinned vet card, broadcast alerts, village health stats.
- **Map** — vet clinic + vaccination points; red outbreak markers (vet only).
- **Trophies** — trophy shelf with rank, reminders, lost trophies.
- **My farm (profile)** — animal list, address, vet mode toggle.

## Look and Feel

Glassmorphism over painted meadow backdrops (one per tab). Big rounded controls, large tap targets, status colors green / yellow / red. i18n: Russian (default), Kyrgyz, English; light + dark theme.

## Features and Behavior

### Vet passport
Per animal: photo, ear tag, vaccination history, next re-vaccination, health journal (milk / expense / illness / death), and buttons to record illness / death or mark a vaccination.

### Vaccination status (FMD)
Green = protected, yellow = due (within 30 days or missing), red = overdue. Shown on cards and the scan plaque.

### Rewards
Trophies per vaccinated animal; reminders at 30 / 7 / 1 days; a trophy is lost when a vaccination lapses. Re-vaccination renews it.

### Vet role
Unlocked after the project owner approves a vet application. Enables outbreak markers on the map and the "Appeals" inbox in chat.

### Private vet chat
Farmer threads = farmer id; the vet sees all farmer threads. Village chat removed.

### Feed
Categorized posts: feed & hay, machinery & herders, quarantine, lost & found.

### Muzzle recognition
Register with 3–5 averaged frames; scan matches by cosine similarity with a species gate, threshold + margin.

## States and Boundaries

- No login screen; the app opens into a seeded demo farm.
- Supabase not configured / tables missing → automatic localStorage fallback + demo data.
- Camera denied → friendly fallback (upload a photo).
- No match → offer to publish to the feed.

## Product Decisions

- **PWA, not native.**
- **Supabase (free tier)** optional; localStorage fallback.
- **Name "Moo".**
- **Village "Nizhny-Chuy"** (demo).
- Veterinarians receive an individual access code and their applications are reviewed manually by the project owner. This process stays manual until the project receives funding.

## What We're Building

The full core loop: vet passports, FMD statuses, private vet chat, trophies, outbreak map, categorized feed, muzzle recognition, glass design, i18n.

## Non-Goals

Payments / marketplace, breeding/genetics analytics, Bluetooth, native app, real push notifications.

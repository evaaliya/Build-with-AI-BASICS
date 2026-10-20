---
doc: scope
status: approved
---

# Moo

One line: a dead-simple phone app where anyone in a village points their camera at a stray cow, sheep, or horse's muzzle and instantly sees the animal and its owner — then messages the owner.

## The Unique Kernel

Village-wide muzzle recognition: owners register each animal once by scanning its muzzle; later, *anyone* can scan it and get the owner's identity. Unregistered animals become a feed post: "is anyone looking for this?"

## Core Loop

Open the app → point at the muzzle/nose pad (close-up) → it's identified with its owner → message the owner. Owners register once.

## What "Working" Looks Like

Register a cow on phone A (4 averaged muzzle frames), scan it on phone B from a different angle → name + owner + phone appear. An unregistered animal → "not found" → published to the feed.

## POC Boundary (frozen)

In:

- Accounts (Supabase Auth, email/password).
- Register an animal by scanning its muzzle (3–5 frames, averaged).
- Scan-to-identify with a species gate + similarity threshold + separation margin.
- Lost-and-found feed (photo + note + comments).
- Shared data in Supabase Postgres with Row Level Security.

Also implemented (one line each, not demoed): village chat, map, reminders.

## Later

- Offline recognition (a small model running on the device).
- More species (goats, pigs, and beyond).
- Roles and permissions (owner vs. vet vs. resident).
- Herd/group management.
- Supabase Storage for photos (instead of data URLs).

## Explicitly Cut

- **True "Face ID" magic** — no off-the-shelf service recognizes animal faces; we approximate it with MobileNet plus honest matching (see `spec.md`).
- **Bluetooth** — can't run recognition offline; offline is a "later" item.
- **Payments, marketplace, breeding/genetics analytics** — out of scope.

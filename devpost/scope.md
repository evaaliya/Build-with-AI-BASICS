---
doc: scope
status: approved
---

> ⚠️ Superseded — the canonical, updated copy is at the repo root: [`scope.md`](../scope.md).

# Moo

One line: a dead-simple phone app where anyone in a village can point their camera at a stray cow, sheep, or horse and instantly see the animal and its owner — then message the owner to come get it.

## The Unique Kernel
Animal face recognition built for a whole village, not one farmer. The magic isn't record-keeping — it's that a lost animal in your garden now has a name and an owner attached to it. Owners register each animal once by scanning its face; later, *anyone* (not just the owner) can scan it and get the owner's identity on the spot. If the animal isn't registered, you snap a photo and post it to a feed: "is anyone looking for this?"

## Who It's For
Residents of a village where livestock grazes freely and wanders into other people's gardens and orchards, eating produce and trampling crops — with no way to know who to hold accountable. Also the owners, who want to find a missing or swapped animal fast. Both sides on one app, kept simple enough for people who aren't comfortable with technology.

## The Core Loop
Open the app → point the camera at an animal's face → it's identified with its owner instantly → message the owner (voice or text) about it. Owners register each animal once by scanning its face. People come back because it turns a recurring village frustration ("whose animal is in my field?") into a two-second answer.

## Inspiration & Identity
Warm, earthy, rural — greens, creams, browns — with light and dark modes. Simple to the point of being obvious: camera-first, big buttons, minimal steps. Think "the WhatsApp of livestock": something a villager who barely uses tech can use on the first try.

## Why This Matters to the Learner
Wants something cool that people actually use — and this solves a real, concrete problem in a village rather than being another demo.

## What "Working" Looks Like
Register a handful of animals (a cow, a sheep, a horse) by scanning each face once. Then scan any of them later, from a different angle, and watch it come back with the right animal and owner — instantly. The "oh, that's cool" beat is pointing a phone at a cow and having its name and owner pop up like magic.

## The POC Boundary
In:
- Accounts on a free backend, for villagers.
- Register an animal by scanning its face once (name, type, breed, owner).
- Scan-to-identify: point the camera, get the animal and its owner.
- An "unregistered animal" feed: post a photo, "is anyone looking for this?"
- Shared voice/text chat about lost stock.
- Per-animal reminders (vaccination, heat cycle, vet visit, weighing).
- A simple searchable list of registered animals.
- Light + dark mode.

## Later
- Offline recognition (a small model running on the device).
- More species (goats, pigs, and beyond).
- Roles and permissions (owner vs vet vs resident).
- Herd/group management — counts, moving animals between groups.

## Explicitly Cut
- **True "Face ID" magic** — no off-the-shelf service recognizes animal faces; we approximate it with a free vision model plus matching. Cut because the real thing doesn't exist for free.
- **Bluetooth** — bluetooth moves data between nearby devices; it can't run recognition offline. Offline is a "later" item instead.
- **Payments, marketplace, breeding/genetics analytics** — out of scope for the POC.

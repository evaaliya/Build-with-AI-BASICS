---
doc: scope
status: approved
---

# Moo

One line: a livestock-biosecurity PWA for a village — a digital vet passport for every animal, Foot-and-Mouth (FMD) vaccination tracking, a private hotline to the village veterinarian, and outbreak awareness on a map.

## The Unique Kernel

A village-wide biosecurity layer: every animal has a **vet passport** (ear tag, vaccination history, health journal) and an **FMD vaccination status** at a glance (green = protected, yellow = due, red = overdue). There is a direct **private chat with the vet**, and only the vet sees **outbreak markers** on the map. On-time vaccination earns **trophies**, so protection is visible and rewarding.

## Who It's For

Smallholders and the single village veterinarian. Villagers need a simple way to keep animals protected and reach the vet fast; the vet needs one place to see outbreaks and answer farmers.

## The Core Loop

Open the app → see animals with FMD statuses → scan an animal → owner + status → chat with the vet → earn trophies for on-time vaccination → (vet only) see outbreaks on the map.

## What "Working" Looks Like

A seeded demo farm shows green / yellow / red FMD badges. Scanning an animal returns owner + status. Entering the vet code (`VET-2026`) reveals outbreak markers. Vaccinating an animal earns a trophy; an expired vaccination marks the trophy as lost.

## POC Boundary (frozen)

In:

- Digital vet passport: ear tag, vaccination history, next re-vaccination, health journal (milk / expense / illness / death).
- FMD vaccination status badges (green / yellow / red) on cards and the scan plaque.
- Private vet chat (farmer threads + vet inbox); village chat removed.
- Vet role (demo code `VET-2026`) + vet-only outbreak markers.
- Rewards (trophies) with 30 / 7 / 1-day reminders and lost trophies.
- Categorized feed (feed & hay, machinery & herders, quarantine, lost & found).
- Muzzle recognition (honest matching + species gate).
- Glass design with per-tab backdrops; i18n (ru / ky / en).

## Later

- Real roles/permissions (store `is_vet` in `profiles`, gate with RLS).
- Move outbreaks to a database table with a vet-only read policy.
- Supabase Storage for photos (instead of data URLs).
- Offline recognition (on-device model).
- More species.

## Explicitly Cut

- True "Face ID" magic — approximated with MobileNet + honest matching.
- Payments, marketplace, breeding/genetics analytics.
- Bluetooth.

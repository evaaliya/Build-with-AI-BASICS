---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast

## Slices

- [ ] **1. App shell with local sign-up/sign-in and a camera scan screen**
  Becomes usable: Open Moo, create an account, and land on a camera-first home screen with a framing circle and a big Scan button. The account persists.
  Why now: Proves scaffold, theme, camera, and storage end to end so every later slice has somewhere to land.
  PRD ref: `prd.md > The Core Journey` (steps 1–3), `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components`, `spec.md > File Structure`
  Build: Scaffold `app/`, add index.html / styles.css / app.js / camera.js / store.js, sign-up/sign-in views, camera view.
  Verify (mechanical): Serve and confirm it loads with no console errors; create an account; reload and confirm it is still signed in; camera asks permission and shows a live preview.
  Learner check: Open the app, sign up, and confirm the camera screen looks and feels right.
  Commit: `App shell: accounts and camera scan screen`

- [ ] **2. Register an animal by scanning its face**
  Becomes usable: Fill in an animal's name/type, scan its face once, and it is saved with its fingerprint.
  Why now: This is the first half of the kernel — the fingerprint that later scans match against.
  PRD ref: `prd.md > Features and Behavior` (Register an animal)
  Spec ref: `spec.md > Components` (recognition.js), `spec.md > Data Model`
  Build: Add recognition.js (load MobileNet, compute embedding), register form, capture → fingerprint → save.
  Verify (mechanical): Register an animal from a photo or camera; confirm the fingerprint (an array of numbers) is stored with the animal.
  Learner check: Register one animal and confirm it shows up in the list with its photo.
  Commit: `Register animal with face fingerprint`

- [ ] **3. Scan to identify — the "oh, that's cool" beat**
  Becomes usable: Point at a registered animal, tap Scan, and its name + owner pop up.
  Why now: This is the kernel. Everything else exists to support this moment.
  PRD ref: `prd.md > Features and Behavior` (Scan to identify)
  Spec ref: `spec.md > Components` (recognition.js matching), `spec.md > Important Failure Modes`
  Build: Compute a fingerprint on scan, cosine-similarity against saved fingerprints, show the top match + confidence or "not found."
  Verify (mechanical): Register two or three animals, scan each again, confirm the correct animal + owner is returned above threshold.
  Learner check: Scan a registered animal and confirm the right name and owner pop up.
  Commit: `Scan-to-identify with nearest-neighbor matching`

- [ ] **4. Feed ("is anyone looking for this?") and chat (text + voice)**
  Becomes usable: Post a photo of an unregistered/lost animal to the feed, and send text/voice messages about it.
  Why now: The second half of the core loop — reaching the owner / flagging a lost animal.
  PRD ref: `prd.md > Features and Behavior` (Feed, Chat)
  Spec ref: `spec.md > Components` (store.js, camera.js audio)
  Build: Feed view (post photo + note), chat view (text + MediaRecorder voice notes).
  Verify (mechanical): Post to the feed and see it appear; send a text and a voice message and replay the voice.
  Learner check: Post a lost animal and message about it.
  Commit: `Feed and voice/text chat`

- [ ] **5. Reminders, animal list/search, and light/dark theme**
  Becomes usable: Add reminders per animal, search the animal list, toggle light/dark.
  Why now: The remaining agreed features, in one pass.
  PRD ref: `prd.md > Features and Behavior` (Reminders, Animal list/search), `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`
  Build: Reminders UI, searchable animal list, theme toggle (CSS variables).
  Verify (mechanical): Add a reminder and confirm it shows on the animal; search filters the list; theme toggle persists.
  Learner check: Try a reminder, search, and both themes.
  Commit: `Reminders, search, and light/dark theme`

- [ ] **6. PWA polish: manifest, service worker, icon**
  Becomes usable: Installable to the home screen, works like an app, loads the offline shell.
  Why now: Finish the "phone app" feel and POC polish.
  PRD ref: `prd.md > Product Decisions` (PWA)
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`
  Build: manifest.webmanifest, sw.js (cache the shell), icons/icon.svg.
  Verify (mechanical): Confirm the manifest + service worker register with no errors; app is installable on a phone browser.
  Learner check: Open on a phone and add to the home screen.
  Commit: `PWA manifest, service worker, and icon`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3 (scan-to-identify kernel)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [to fill]
Route and stops: [to fill]
Edit outcome: [to fill]
Reflection: [to fill]
Activity mode: [to fill]

## Revisions

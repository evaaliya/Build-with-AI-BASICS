---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. App shell with local sign-up/sign-in and a camera scan screen**
  Becomes usable: Open Moo, create an account, and land on a camera-first home screen with a framing circle and a big Scan button. The account persists.
  Why now: Proves scaffold, theme, camera, and storage end to end so every later slice has somewhere to land.
  PRD ref: `prd.md > The Core Journey` (steps 1–3), `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components`, `spec.md > File Structure`
  Build: Scaffold `app/`, add index.html / styles.css / app.js / camera.js / store.js, sign-up/sign-in views, camera view.
  Verify (mechanical): Serve and confirm it loads with no console errors; create an account; reload and confirm it is still signed in; camera asks permission and shows a live preview.
  Learner check: Open the app, sign up, and confirm the camera screen looks and feels right.
  Commit: `App shell: accounts and camera scan screen`

- [x] **2. Register an animal by scanning its face**
  Becomes usable: Fill in an animal's name/type, scan its face once, and it is saved with its fingerprint.
  Why now: This is the first half of the kernel — the fingerprint that later scans match against.
  PRD ref: `prd.md > Features and Behavior` (Register an animal)
  Spec ref: `spec.md > Components` (recognition.js), `spec.md > Data Model`
  Build: Add recognition.js (load MobileNet, compute embedding), register form, capture → fingerprint → save.
  Verify (mechanical): Register an animal from a photo or camera; confirm the fingerprint (an array of numbers) is stored with the animal.
  Learner check: Register one animal and confirm it shows up in the list with its photo.
  Commit: `Register animal with face fingerprint`

- [x] **3. Scan to identify — the "oh, that's cool" beat**
  Becomes usable: Point at a registered animal, tap Scan, and its name + owner pop up.
  Why now: This is the kernel. Everything else exists to support this moment.
  PRD ref: `prd.md > Features and Behavior` (Scan to identify)
  Spec ref: `spec.md > Components` (recognition.js matching), `spec.md > Important Failure Modes`
  Build: Compute a fingerprint on scan, cosine-similarity against saved fingerprints, show the top match + confidence or "not found."
  Verify (mechanical): Register two or three animals, scan each again, confirm the correct animal + owner is returned above threshold.
  Learner check: Scan a registered animal and confirm the right name and owner pop up.
  Commit: `Scan-to-identify with nearest-neighbor matching`

- [x] **4. Feed ("is anyone looking for this?") and chat (text + voice)**
  Becomes usable: Post a photo of an unregistered/lost animal to the feed, and send text/voice messages about it.
  Why now: The second half of the core loop — reaching the owner / flagging a lost animal.
  PRD ref: `prd.md > Features and Behavior` (Feed, Chat)
  Spec ref: `spec.md > Components` (store.js, camera.js audio)
  Build: Feed view (post photo + note), chat view (text + MediaRecorder voice notes).
  Verify (mechanical): Post to the feed and see it appear; send a text and a voice message and replay the voice.
  Learner check: Post a lost animal and message about it.
  Commit: `Feed and voice/text chat`

- [x] **5. Reminders, animal list/search, and light/dark theme**
  Becomes usable: Add reminders per animal, search the animal list, toggle light/dark.
  Why now: The remaining agreed features, in one pass.
  PRD ref: `prd.md > Features and Behavior` (Reminders, Animal list/search), `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`
  Build: Reminders UI, searchable animal list, theme toggle (CSS variables).
  Verify (mechanical): Add a reminder and confirm it shows on the animal; search filters the list; theme toggle persists.
  Learner check: Try a reminder, search, and both themes.
  Commit: `Reminders, search, and light/dark theme`

- [x] **6. PWA polish: manifest, service worker, icon**
  Becomes usable: Installable to the home screen, works like an app, loads the offline shell.
  Why now: Finish the "phone app" feel and POC polish.
  PRD ref: `prd.md > Product Decisions` (PWA)
  Spec ref: `spec.md > Stack`, `spec.md > File Structure`
  Build: manifest.webmanifest, sw.js (cache the shell), icons/icon.svg.
  Verify (mechanical): Confirm the manifest + service worker register with no errors; app is installable on a phone browser.
  Learner check: Open on a phone and add to the home screen.
  Commit: `PWA manifest, service worker, and icon`

- [x] **7. Vet passport and FMD vaccination statuses**
  Becomes usable: Animals show an ear tag, vaccination history, a health journal, and a green/yellow/red FMD badge on every card and the scan plaque.
  Why now: The pivot from "find a stray animal" to livestock biosecurity — vaccination status is the core signal.
  PRD ref: `prd.md > Features and Behavior` (Vet passport, Vaccination status)
  Spec ref: `spec.md > Data Model` (animals.vaccinations, health, tag_number)
  Build: Extend the animal model (tagNumber, vaccinations, health), add badges, the scan plaque, and the vet-passport detail card.
  Verify (mechanical): Seed 4 demo animals with protected/due/overdue FMD states; confirm badges and the scan plaque render with no console errors.
  Learner check: Open the app and confirm the vaccination badges are readable at a glance.
  Commit: `Transform Moo into an animal-health platform`

- [x] **8. Vet hotline and village health**
  Becomes usable: The chat tab shows the pinned vet (emergency call), broadcast alerts, and village health stats.
  Why now: The vet is the single point of contact in a village — reaching them must be one tap.
  PRD ref: `prd.md > Features and Behavior` (Vet hotline)
  Spec ref: `spec.md > Components` (mock.js)
  Build: Add the vet card, broadcast banners, and health-stat cards.
  Verify (mechanical): Confirm the vet card, 3 broadcasts, and 4 stat cards render.
  Learner check: Open Chat and confirm the vet card and alerts are visible.
  Commit: `Transform Moo into an animal-health platform`

- [x] **9. Glass design and 5-tab navigation**
  Becomes usable: Glassmorphism UI with per-tab backdrops and a floating 5-tab nav (Find, Feed, Chat, Map, Trophies).
  Why now: The requested premium look, plus a dedicated trophies tab.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Components` (glass.css, img/)
  Build: Add glass.css + img/ backdrops, the day/night switch, per-tab backgrounds, and the 5-item nav.
  Verify (mechanical): Confirm the nav is centered at 390px and desktop widths, and no content overlaps the nav.
  Learner check: Switch tabs and day/night; confirm nothing overlaps.
  Commit: `Add glass design, trophies, vet mode and private vet chat`

- [x] **10. Rewards (trophies)**
  Becomes usable: Vaccinating an animal earns a trophy; reminders fire at 30/7/1 days; an expired vaccination loses the trophy.
  Why now: Makes protection visible and rewarding.
  PRD ref: `prd.md > Features and Behavior` (Rewards)
  Spec ref: `spec.md > Components` (rewards.js)
  Build: Add rewards.js (evaluate/loadState/shelfHtml/vaccinateAnimal), the trophies screen, and the "Mark vaccinated" button.
  Verify (mechanical): Vaccinate an animal → trophy appears; seed an overdue animal → trophy marked lost.
  Learner check: Mark a vaccination and confirm a trophy/toast appears.
  Commit: `Add glass design, trophies, vet mode and private vet chat`

- [x] **11. Vet role and outbreak map**
  Becomes usable: Entering VET-2026 enables vet mode; red outbreak markers appear on the map only then.
  Why now: The vet needs outbreak visibility; everyone else should not see it.
  PRD ref: `prd.md > Features and Behavior` (Vet role)
  Spec ref: `spec.md > Components` (vet.js)
  Build: Add vet.js (isVet/enableVet/disableVet/renderOutbreaks), the profile vet toggle, and the map outbreak layer.
  Verify (mechanical): With vet off, no outbreak pins; with VET-2026, 3 pins render; disabling removes them.
  Learner check: Enable vet mode and confirm the map changes.
  Commit: `Add glass design, trophies, vet mode and private vet chat`

- [x] **12. Private vet chat**
  Becomes usable: Farmers chat privately with the vet (their own thread); the vet sees an "Appeals" inbox.
  Why now: The vet hotline needs a private channel, not a public village chat.
  PRD ref: `prd.md > Features and Behavior` (Private vet chat)
  Spec ref: `spec.md > Data Model` (messages.thread, profiles.is_vet)
  Build: Add message.thread, the vet thread filter, the vet inbox, and the RLS SQL.
  Verify (mechanical): A village message is not visible in the vet thread and vice versa; the vet inbox lists farmer threads.
  Learner check: Send a vet message and confirm it does not appear in the village chat.
  Commit: `Add glass design, trophies, vet mode and private vet chat`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 3 (scan-to-identify kernel)
- [x] Final kick-the-tires exploration and feedback completed

## Final Review

- [x] Final review complete — feedback resolved and learner moving to submission

## Code Tour and App Map

- [x] Learning activity complete — brief recap (learner drove hands-on testing and feedback throughout the build)
- [x] Optional edit and transfer reflection addressed — offered in app-map.html; personal reflection belongs in the ignored profile
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Hands-on build-and-test over many iterations with learner feedback; no separate guided tour needed (practice already happened during the build). See devpost/app-map.html.
Route and stops: `app/app.js` (onScan, initMap), `app/recognition.js` (fingerprintOf/findMatch), `app/store.js` (localStorage data) — documented in devpost/app-map.html.
Edit outcome: Multiple fixes from learner feedback (lazy-load heavy CDN libs, save session on Supabase login, feed comments, profile-to-map house).
Reflection: offered (transfer question in app-map.html); learner answer not yet recorded.
Activity mode: recap / prior practice connected

## Revisions

- **Local-first storage instead of Firebase** — the spec assumed a Firebase backend, but the build made the data layer `localStorage`-only so the POC runs with zero setup and is verifiable without keys. Firebase is the documented multi-user swap-in (`README.md`, `spec.md > What Was Simplified and Why`).
- **Single-camera handoff between views** — phones allow only one active camera, so `show()` stops one view's camera before starting another (`app/app.js`).
- **Shell/integration briefly stuck mid-build** — recovered; all slices committed and pushed to GitHub.
- **Supabase auth instead of Firebase** — email/password accounts now use Supabase (free tier, not Google). Data stays local for now. `app/supabase-config.js` holds the public config; without it the app falls back to local accounts.
- **Supabase Postgres with RLS instead of localStorage** — animals (with averaged muzzle fingerprints), posts, messages, and profiles now live in Supabase Postgres (`supabase/schema.sql`), shared across phones. `app/store.js` keeps a localStorage fallback when Supabase isn't configured.
- **Honest, measurable recognition** — registration averages 4 muzzle frames; a MobileNet species gate prevents sheep↔horse mix-ups; matching requires a similarity threshold *and* a separation margin over the runner-up. Below threshold the app shows no phone and offers "publish to feed" instead. Thresholds are tunable with `tools/calibrate.html`.
- **Scope frozen for the demo** — the 90-second demo covers register → scan-on-second-phone → owner found → "not found" → feed. Chat, map, and reminders are implemented but not demoed.
- **Pivot to livestock biosecurity (AgTech / Animal Health)** — the product moved from "find a stray animal by its muzzle" to a digital vet passport with FMD vaccination tracking, a private vet hotline, trophies for on-time vaccination, and a vet-only outbreak map. The planning docs (`scope.md`, `prd.md`, `spec.md`) were updated to match.
- **Glass design layer** — `glass.css` + per-tab backdrops replace the earlier cartoon layer; the bottom nav became 5 tabs (Find, Feed, Chat, Map, Trophies).
- **Private vet chat** — messages gained a `thread` column; farmers see their own vet thread, the vet sees an "Appeals" inbox. Village chat was removed.
- **Code and README translated to English** — Russian remains only in the i18n dictionaries (ru/ky/en).

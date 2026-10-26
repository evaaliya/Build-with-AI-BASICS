# Moo tests

Install once:

```bash
cd tests
npm install
```

## Unit (`npm run unit`)

Runs Node’s built-in test runner on `unit/*.test.js`:

- `logic.test.js` — vaccination status boundaries, reminders, points (verified only), booking/queue, segments, village %.
- `auth.test.js` — `resolveAppRole`, application status transitions, map overlay leak guard, auth error keys, demo flag.

No network required. Alternate: `npm run unit:local` (logic only, paths relative to `tests/`).

## RLS (`npm run rls`)

```bash
npm run rls
# → node rls/rls.mjs
```

Talks to the configured Supabase project with the publishable key (and any env the script documents). Asserts farmers cannot self-promote, cannot read neighbour vaccinations via `animals_public`, anon is blocked, etc. Does not print secrets. Results: console + `rls/last-run.json` / `rls/PART-B-RESULTS.md`. Working RLS / view fixes live in `supabase/sql/004_vet_code_and_masking.sql`.

## E2E / Playwright

```bash
npm run e2e
# → PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node e2e/demo.mjs
```

Uses system Google Chrome. Starts a local static server for `app/`, drives Try demo (farmer/vet), checks offline shell and map iframe (no mirror). Screenshots and JSON under `tests/screens/` are **generated** by these scripts (the folder is gitignored; re-run e2e to recreate). Curated README images stay in `docs/screenshots/`.

Extra scripts (same pattern, own ports):

| Script | What it covers | Output (generated) |
| --- | --- | --- |
| `node e2e/auth-welcome.mjs` | Auth “What is Moo?” block, locales, themes | `tests/screens/auth-welcome/` |
| `node e2e/demo-statuses.mjs` | Four demo animals / status colors | `tests/screens/demo-statuses/` |
| `node e2e/demo-map-placement.mjs` | Demo pins on real house footprints | `tests/screens/demo-map/` |
| `node e2e/en-no-cyrillic.mjs` | Demo EN UI has no Cyrillic (all screens + map iframe); RU still has Cyrillic | `tests/screens/en-no-cyrillic/` |
| `node e2e/readme-screenshots.mjs` | Regenerate `docs/screenshots/*.png` (EN, light, 780×1688) | `docs/screenshots/` |

Demo people, animals, places, feed, chats, and map chrome are localized per language (`app/demo-content.js` + map `moo:lang`).

## Reports

Human write-ups of full runs: `TEST-REPORT.md`, `TEST-REPORT-2.md`, `TEST-REPORT-3.md`, `TEST-REPORT-4.md`. Headline finding: two critical RLS holes (self-promote vet; neighbour vaccination leak) were found and fixed.

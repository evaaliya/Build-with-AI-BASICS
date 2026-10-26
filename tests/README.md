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

Talks to the configured Supabase project with the publishable key (and any env the script documents). Asserts farmers cannot self-promote, cannot read neighbour vaccinations via `animals_public`, anon is blocked, etc. Does not print secrets. Results: console + `rls/last-run.json` / `rls/PART-B-RESULTS.md`. Proposed SQL history: `rls-fixes-proposed.sql`.

## E2E / Playwright

```bash
npm run e2e
# → PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node e2e/demo.mjs
```

Uses system Google Chrome. Starts a local static server for `app/`, drives Try demo (farmer/vet), checks offline shell and map iframe (no mirror). Screenshots → `screens/`; summary JSON → `screens/e2e-results.json`.

Extra scripts (same pattern, own ports):

| Script | What it covers | Output |
| --- | --- | --- |
| `node e2e/auth-welcome.mjs` | Auth “What is Moo?” block, locales, themes | `screens/auth-welcome/` |
| `node e2e/demo-statuses.mjs` | Four demo animals / status colors | `screens/demo-statuses/` |
| `node e2e/demo-map-placement.mjs` | Demo pins on real house footprints | `screens/demo-map/` |

## Reports

Human write-ups of full runs: `TEST-REPORT.md`, `TEST-REPORT-2.md`, `TEST-REPORT-3.md`, `TEST-REPORT-4.md`. Headline finding: two critical RLS holes (self-promote vet; neighbour vaccination leak) were found and fixed.

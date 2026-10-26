# Recognition calibration

`calibrate.html` measures MobileNet cosine similarity on real photos so you can
set an honest `MATCH_THRESHOLD` and `MATCH_MARGIN` instead of guessing.

Shipped values in `app/recognition.js` (re-verify after recalibrating):

| Constant | Value |
| --- | --- |
| `MATCH_THRESHOLD` | 0.53 |
| `MATCH_MARGIN` | 0.05 |
| `SPECIES_CONFIDENCE` | 0.35 |
| `FRAMES_TO_CAPTURE` | 3 |

## Run it

**Do not open the file via `file://`** — the CDN model often fails. Serve the repo:

```bash
cd /path/to/Build-with-AI-BASICS
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open: [http://127.0.0.1:8000/tools/calibrate.html](http://127.0.0.1:8000/tools/calibrate.html)

1. Click **Load MobileNet** (needs internet). UI labels may be Russian; the flow is the same.
2. **Same animal (genuine)** — add photos repeatedly (≥ 2 of ONE animal). JPG/PNG/WebP, not HEIC.
3. **Other animals (impostor)** — add 1+ photos of *different* animals.
4. Click **Compute** / the calculate control.

If something fails, the red banner and log panel show the real error (bad image format, CDN blocked, etc.).

## Copy the numbers

Paste the "Copy report" markdown into `README.md` and `spec.md`, then update the
constants in `app/recognition.js`:

```js
const MATCH_THRESHOLD = /* measured */;
const MATCH_MARGIN = /* measured */;
```

## Why this matters

MobileNet is a classifier, not a face-ID model, so different individuals of the
same species can be close in embedding space. Measuring the genuine/impostor gap
is how we keep the demo honest and pick numbers from data, not magic.

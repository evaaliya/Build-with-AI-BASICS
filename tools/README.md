# Recognition calibration

`calibrate.html` measures MobileNet cosine similarity on real photos so you can
set an honest `MATCH_THRESHOLD` and `MATCH_MARGIN` instead of guessing.

## Run it

**Do not open the file via `file://`** — the CDN model often fails. Serve the repo:

```bash
cd /path/to/Build-with-AI-BASICS
python3 -m http.server 8000
```

Then open: [http://localhost:8000/tools/calibrate.html](http://localhost:8000/tools/calibrate.html)

1. Click **Загрузить MobileNet** (needs internet).
2. **Same animal (genuine)** — tap **«+ Добавить фото»** repeatedly (each pick *adds* to the list; phone pickers often allow only one file at a time). Need ≥ 2 photos of ONE animal. JPG/PNG/WebP, not HEIC.
3. **Other animals (impostor)** — same: add 1+ photos of *different* animals.
4. Click **Посчитать**.

If something fails, the red banner and black log panel show the real error (bad image format, CDN blocked, etc.).

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

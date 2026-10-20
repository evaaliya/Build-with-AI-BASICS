# Recognition calibration

`calibrate.html` measures MobileNet cosine similarity on real photos so you can
set an honest `MATCH_THRESHOLD` and `MATCH_MARGIN` instead of guessing.

## Run it

1. Open `tools/calibrate.html` (serve the repo with `python3 -m http.server` or
   open the file directly — it only needs the internet for the MobileNet CDN).
2. Click **Load MobileNet**.
3. **Same animal (genuine)** — pick 3–8 photos of ONE animal from different angles.
4. **Other animals (impostor)** — pick 8–12 photos of *different* animals,
   ideally the same species (e.g. other cows).
5. Click **Compute**. It reports the genuine vs. impostor similarity
   distributions and recommends a threshold + margin.

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

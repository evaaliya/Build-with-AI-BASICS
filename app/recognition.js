// Moo — animal "muzzle fingerprint" using a free in-browser MobileNet model.
//
// Honest, measurable recognition:
//   * We turn a close-up of the muzzle / nose pad into a 1280-number embedding.
//     Livestock nose-print (planum nasolabiale) has long been used as a
//     biometric, so we ask the user to frame it close-up.
//   * Registration averages FRAMES_TO_CAPTURE frames into one stable fingerprint.
//   * A MobileNet classification gate checks the species so a sheep is not
//     matched against a horse.
//   * A match must clear BOTH a similarity threshold AND a "separation" margin
//     over the second-best candidate (otherwise we say "not sure").
//
// The thresholds below are the shipped defaults. Tune them with
// tools/calibrate.html against 10–20 real photos and record the measured
// numbers in README.md and spec.md.

import { captureFrame, toSquare } from './camera.js';
import { loadScript } from './loader.js';

// Recognition constants (tune via tools/calibrate.html).
const MATCH_THRESHOLD = 0.88;   // cosine similarity required for "found it"
const MATCH_MARGIN = 0.06;      // best candidate must beat 2nd best by this
const SPECIES_CONFIDENCE = 0.35; // mobilenet.classify score to trust the species
const FRAMES_TO_CAPTURE = 4;    // frames averaged at registration

let model = null;
let loading = null;

async function loadModel() {
  if (model) return model;
  if (!loading) {
    loading = (async () => {
      if (!window.tf) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      if (!window.mobilenet) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js');
      if (!window.tf || !window.mobilenet) {
        throw new Error('AI model failed to load — check your internet connection and reload.');
      }
      model = await window.mobilenet.load({ version: 2, alpha: 1.0 });
      return model;
    })();
  }
  return loading;
}

// Turn an image (video element or canvas) into its 1280-number fingerprint.
async function fingerprintOf(source) {
  const m = await loadModel();
  const canvas = source.tagName === 'VIDEO' ? captureFrame(source) : source;
  const square = toSquare(canvas, 224);
  const embedding = m.infer(square, true);
  const arr = Array.from(await embedding.data());
  embedding.dispose();
  return arr;
}

// MobileNet classification: resolves to [{ className, probability }, ...].
async function classifyImage(source) {
  const m = await loadModel();
  const canvas = source.tagName === 'VIDEO' ? captureFrame(source) : source;
  const square = toSquare(canvas, 224);
  return m.classify(square, 10);
}

// ImageNet labels -> our species buckets. Used to prevent cow/sheep/horse mix-ups.
const SPECIES_KEYWORDS = {
  cow: ['cow', 'ox', 'bull', 'cattle', 'oxen', 'bison'],
  sheep: ['sheep', 'ram', 'ewe', 'lamb'],
  horse: ['horse', 'pony', 'stallion', 'mare', 'colt', 'zebra'],
};

function detectSpecies(labels) {
  const scores = { cow: 0, sheep: 0, horse: 0 };
  for (const l of labels || []) {
    const cn = (l.className || '').toLowerCase();
    for (const [type, kws] of Object.entries(SPECIES_KEYWORDS)) {
      if (kws.some((k) => cn.includes(k))) scores[type] += l.probability;
    }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { type: best[0], score: best[1] };
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

// Average a list of equal-length fingerprints into one.
function averageFingerprints(list) {
  if (!list || !list.length) return null;
  const len = list[0].length;
  const out = new Array(len).fill(0);
  for (const f of list) for (let i = 0; i < len; i++) out[i] += f[i];
  for (let i = 0; i < len; i++) out[i] /= list.length;
  return out;
}

// Rank candidates and return the best match plus separation from the 2nd.
function findMatch(fingerprint, animals, opts = {}) {
  const threshold = opts.threshold ?? MATCH_THRESHOLD;
  const margin = opts.margin ?? MATCH_MARGIN;
  const ranked = [];
  for (const a of animals) {
    if (!Array.isArray(a.fingerprint) || a.fingerprint.length !== fingerprint.length) continue;
    ranked.push({ animal: a, similarity: cosine(fingerprint, a.fingerprint) });
  }
  ranked.sort((x, y) => y.similarity - x.similarity);
  if (!ranked.length) return null;
  const best = ranked[0];
  const second = ranked[1] || null;
  const separation = second ? best.similarity - second.similarity : 1;
  const matched = best.similarity >= threshold && separation >= margin;
  return {
    animal: best.animal,
    similarity: best.similarity,
    secondSimilarity: second ? second.similarity : null,
    separation,
    matched,
  };
}

export {
  loadModel, fingerprintOf, classifyImage, detectSpecies,
  findMatch, cosine, averageFingerprints,
  MATCH_THRESHOLD, MATCH_MARGIN, SPECIES_CONFIDENCE, FRAMES_TO_CAPTURE,
};

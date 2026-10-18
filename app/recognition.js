// Moo — animal "face fingerprint" using a free in-browser MobileNet model.
// We turn an image into a 1280-number vector, then compare vectors with cosine
// similarity. There is no free "animal Face ID" API, so this is the honest,
// achievable stand-in (see spec.md).

import { captureFrame, toSquare } from './camera.js';

let model = null;
let loading = null;

async function loadModel() {
  if (model) return model;
  if (!loading) {
    loading = (async () => {
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

// Find the closest registered animal (or null if none have a fingerprint).
function findMatch(fingerprint, animals) {
  let best = null;
  for (const a of animals) {
    if (!a.fingerprint || a.fingerprint.length !== fingerprint.length) continue;
    const s = cosine(fingerprint, a.fingerprint);
    if (!best || s > best.similarity) best = { animal: a, similarity: s };
  }
  return best;
}

export { loadModel, fingerprintOf, findMatch, cosine };

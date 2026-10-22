// Moo — camera helpers. Supports multiple video elements (one active at a time).

const streams = new Map(); // videoEl -> MediaStream

async function startCamera(videoEl) {
  if (streams.has(videoEl)) return streams.get(videoEl);
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera is not available in this browser.');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  streams.set(videoEl, stream);
  return stream;
}

function stopCamera(videoEl) {
  const s = streams.get(videoEl);
  if (s) {
    s.getTracks().forEach((t) => t.stop());
    streams.delete(videoEl);
  }
  if (videoEl) videoEl.srcObject = null;
}

function stopAllCameras() {
  for (const [el, s] of streams) {
    s.getTracks().forEach((t) => t.stop());
    if (el) el.srcObject = null;
  }
  streams.clear();
}

// Capture the current video frame to a canvas.
function captureFrame(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  canvas.getContext('2d', { alpha: false }).drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Center-crop a canvas to a square and resize it (MobileNet wants 224x224).
function toSquare(canvas, size = 224) {
  const side = Math.min(canvas.width, canvas.height);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d', { alpha: false });
  const sx = (canvas.width - side) / 2;
  const sy = (canvas.height - side) / 2;
  ctx.drawImage(canvas, sx, sy, side, side, 0, 0, size, size);
  return out;
}

// One-step center-crop from a live video into a 224² canvas (avoids a huge intermediate bitmap).
function captureSquare(videoEl, size = 224) {
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  out.getContext('2d', { alpha: false }).drawImage(videoEl, sx, sy, side, side, 0, 0, size, size);
  return out;
}

// ---- audio (voice notes) ----
async function recordAudio() {
  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(audioStream);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => {
        audioStream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
      };
      rec.stop();
    }),
  };
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export { startCamera, stopCamera, stopAllCameras, captureFrame, captureSquare, toSquare, recordAudio, blobToDataURL };

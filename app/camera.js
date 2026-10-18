// Moo — camera helpers.

let stream = null;

async function startCamera(videoEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera is not available in this browser.');
  }
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

// Capture the current video frame to a canvas.
function captureFrame(videoEl) {
  const canvas = document.createElement('canvas');
  canvas.width = videoEl.videoWidth || 640;
  canvas.height = videoEl.videoHeight || 480;
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Center-crop a canvas to a square and resize it (MobileNet wants 224x224).
function toSquare(canvas, size = 224) {
  const side = Math.min(canvas.width, canvas.height);
  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d');
  const sx = (canvas.width - side) / 2;
  const sy = (canvas.height - side) / 2;
  ctx.drawImage(canvas, sx, sy, side, side, 0, 0, size, size);
  return out;
}

export { startCamera, stopCamera, captureFrame, toSquare };

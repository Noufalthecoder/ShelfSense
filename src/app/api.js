import { findDemo } from './catalog.js';

const FRIENDLY = {
  error_no_face: "We couldn't find a face. Face the camera in good, even light.",
  error_large_face_angle: 'Look straight at the camera, chin level.',
  error_src_face_too_small: 'Move closer so your face fills the oval.',
  error_src_face_out_of_bound: 'Keep your whole face inside the oval.',
  error_multiple_people: 'Only one face in the photo, please.',
  exceed_max_filesize: 'That image is too large. Try another photo.',
  missing_key: 'The YouCam API key is missing on the server.',
  poll_timeout: 'YouCam is taking too long. Please try again.',
  no_credits: 'Live try-on needs YouCam credits. Here is the shade instead.',
};

export async function getStatus() {
  try {
    return await (await fetch('/api/status')).json();
  } catch {
    return { units: null, demo: false };
  }
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(FRIENDLY[data.error_code] ?? data.error ?? `Request failed (${res.status})`);
    err.code = data.error_code;
    throw err;
  }
  return data;
}

export async function analyzeSkin(blob) {
  return handle(await fetch('/api/skin-analysis', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }));
}

export async function tryOn(imageDataUrl, effects) {
  return handle(await fetch('/api/makeup-vto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl, effects }),
  }));
}

export async function lookupProduct(code) {
  const demo = findDemo(code);
  if (demo) return demo;
  const res = await fetch(`/api/product/${code}`);
  if (res.status === 404) return null;
  return handle(res);
}

// draw a video frame or image to a JPEG, long side capped for upload size
export async function toJpeg(source, maxSide = 1600) {
  const w = source.videoWidth || source.naturalWidth;
  const h = source.videoHeight || source.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', .92));
  return { blob, dataUrl: canvas.toDataURL('image/jpeg', .92), width: canvas.width, height: canvas.height };
}

/**
 * Capture only the region around the on-screen face guide, so the face fills the image
 * (YouCam rejects selfies where the face is a small part of a wide webcam frame).
 * `box` is a fraction of the visible video area; small crops are upscaled to `minShort`.
 */
export async function captureGuide(video, box, minShort = 720, maxSide = 1600) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const s = Math.max(video.clientWidth / vw, video.clientHeight / vh);
  const visW = video.clientWidth / s;
  const visH = video.clientHeight / s;
  const sx = (vw - visW) / 2 + box.x * visW;
  const sy = (vh - visH) / 2 + box.y * visH;
  const sw = box.w * visW;
  const sh = box.h * visH;
  const scale = Math.min(Math.max(minShort / Math.min(sw, sh), 1), maxSide / Math.max(sw, sh));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', .92));
  return { blob, dataUrl: canvas.toDataURL('image/jpeg', .92), width: canvas.width, height: canvas.height };
}

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(file);
  });
}

// Shrinks images in the browser before upload, WebP when the browser can encode it,
// otherwise JPEG. A 5 MB phone photo or screenshot becomes a small file.
const SIZE = 480;
const SHOT_WIDTH = 1600; // project screenshots: sharp on 2x screens at the ~760px featured card
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;

async function readBitmap(file) {
  if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error("That file is over 15 MB. Choose a smaller image.");

  // createImageBitmap applies the EXIF rotation, so phone photos are the right way up.
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("This image format can't be read by your browser. Try a JPEG or PNG.");
  }
}

async function encode(canvas, quality) {
  const toBlob = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q));
  let blob = await toBlob("image/webp", quality);
  // Older Safari cannot encode WebP and silently returns PNG; JPEG is much smaller then.
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", quality + 0.03);
  if (!blob) throw new Error("Could not process the image.");
  return blob;
}

// Profile photo: center-cropped to 480x480 (sharp on 2x screens at the 220px display size).
// Roughly 20-40 KB.
export async function toSquarePhoto(file) {
  const bitmap = await readBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  // Square crop: centered horizontally, biased toward the top so faces stay in frame.
  const sx = (bitmap.width - side) / 2;
  const sy = bitmap.height > bitmap.width ? (bitmap.height - side) * 0.2 : 0;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close?.();
  return encode(canvas, 0.85);
}

// Project screenshot: not cropped (the card shows it top-aligned), only scaled down to
// 1600px wide. Usually 80-250 KB.
export async function toScreenshot(file) {
  const bitmap = await readBitmap(file);
  const scale = Math.min(1, SHOT_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return encode(canvas, 0.82);
}

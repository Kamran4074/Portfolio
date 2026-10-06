// Turns any photo the user picks into a small square image before upload:
// center-cropped, 480x480 (sharp on 2x screens at the 220px display size), WebP when the
// browser can encode it, otherwise JPEG. A 5 MB phone photo becomes roughly 20-40 KB.
const SIZE = 480;
export const MAX_INPUT_BYTES = 15 * 1024 * 1024;

export async function toSquarePhoto(file) {
  if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/i.test(file.type)) {
    throw new Error("Choose a JPEG, PNG or WebP image.");
  }
  if (file.size > MAX_INPUT_BYTES) throw new Error("That file is over 15 MB. Choose a smaller image.");

  // createImageBitmap applies the EXIF rotation, so phone photos are the right way up.
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image format can't be read by your browser. Try a JPEG or PNG.");
  }

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

  const encode = (type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await encode("image/webp", 0.85);
  // Older Safari cannot encode WebP and silently returns PNG; JPEG is much smaller then.
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88);
  if (!blob) throw new Error("Could not process the image.");
  return blob;
}

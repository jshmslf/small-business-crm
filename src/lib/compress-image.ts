const MAX_DIMENSION = 1600; // longest side, in px
const QUALITY = 0.85;

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Shrinks a photo in the browser before upload: longest side 1600px, WebP (or JPEG
 * where WebP encoding isn't supported). Returns the original file whenever it can't
 * do better — unsupported formats (e.g. HEIC outside Safari), GIFs, or no size gain.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  let bitmap: ImageBitmap;
  try {
    // Applies EXIF orientation, so phone photos keep the right way up
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  // White background so transparent PNGs don't turn black as JPEG
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Browsers that can't encode WebP silently return a PNG instead
  let blob = await toBlob(canvas, "image/webp");
  if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob || blob.size >= file.size) return file;

  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const name = `${file.name.replace(/\.[^.]+$/, "")}.${extension}`;
  return new File([blob], name, { type: blob.type });
}

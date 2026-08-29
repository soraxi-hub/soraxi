import {
  IMAGE_COMPRESSION_MAX_DIMENSION,
  IMAGE_COMPRESSION_TARGET_BYTES,
} from "@/constants/image.constants";

/**
 * Client-side image compression.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * Our serverless host rejects request bodies over roughly 4.5MB before the
 * route runs, so an oversized upload never reaches our error handling: the
 * browser gets the platform's error page, the client cannot parse it as JSON,
 * and the user is shown a message about failing to parse an error response.
 *
 * Three phone photos are comfortably 15-30MB. Rather than refuse them — which
 * is what a smaller size limit amounts to — they are decoded, scaled down and
 * re-encoded in the browser until each fits the per-image budget. The person
 * uploading sees a normal upload; the request that leaves is a fraction of what
 * they selected.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIBERATELY FRAMEWORK-FREE
 * ─────────────────────────────────────────────────────────────────────────────
 * No React, no hooks, no toasts. It takes a File and resolves a File, so it can
 * be called from a hook, an event handler or a test without dragging any of
 * that in. Reporting progress and failure is the caller's job.
 *
 * Browser-only: it needs canvas. Callers are client components.
 */

export interface CompressImageOptions {
  /** Stop compressing once the file is at or below this many bytes. */
  targetBytes?: number;
  /** Longest edge in pixels after scaling. */
  maxDimension?: number;
  /** Initial encoder quality, 0-1. Lowered stepwise if the target is missed. */
  quality?: number;
  /** Never go below this quality; scale the image down instead. */
  minQuality?: number;
}

/** Quality is reduced along this ladder before dimensions are cut again. */
const QUALITY_STEPS: readonly number[] = [0.82, 0.7, 0.6, 0.5, 0.42];

/** How many times the image may be scaled down after exhausting the ladder. */
const MAX_SCALE_ATTEMPTS = 3;

/** Each extra attempt multiplies the longest edge by this. */
const SCALE_FACTOR = 0.75;

/**
 * WebP is the output format: it is in our allow-list, encodes markedly smaller
 * than JPEG at equivalent quality, and — unlike JPEG — preserves transparency,
 * so a PNG logo does not come back with a black background.
 */
const OUTPUT_TYPE = "image/webp";
const FALLBACK_TYPE = "image/jpeg";

/**
 * Compresses one image so it fits the per-image budget.
 *
 * Returns the **original file untouched** when it already fits, when the
 * browser cannot decode it, or when compression would make it larger — which
 * genuinely happens for small flat-colour PNGs. Compression is an optimisation,
 * so failing to achieve it is never an error; the caller still gets a usable
 * file and the server-side limits remain the real gate.
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const {
    targetBytes = IMAGE_COMPRESSION_TARGET_BYTES,
    maxDimension = IMAGE_COMPRESSION_MAX_DIMENSION,
    quality = QUALITY_STEPS[0],
    minQuality = QUALITY_STEPS[QUALITY_STEPS.length - 1],
  } = options;

  if (typeof document === "undefined") return file;

  // Already small enough, and re-encoding could only lose detail for no gain.
  if (file.size <= targetBytes) return file;

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await decode(file);
  } catch {
    // An image the browser will not decode is one we cannot compress. Hand it
    // back and let validation and the server decide its fate.
    return file;
  }

  try {
    const outputType = (await supportsWebP()) ? OUTPUT_TYPE : FALLBACK_TYPE;
    const steps = QUALITY_STEPS.filter((q) => q <= quality && q >= minQuality);
    if (!steps.includes(minQuality)) steps.push(minQuality);

    let dimension = maxDimension;

    for (let attempt = 0; attempt <= MAX_SCALE_ATTEMPTS; attempt++) {
      const canvas = drawScaled(bitmap, dimension);
      if (!canvas) return file;

      for (const step of steps) {
        const blob = await toBlob(canvas, outputType, step);
        if (!blob) continue;

        if (blob.size <= targetBytes) {
          // Compression that inflates the file is worse than none. Small PNGs
          // and already-optimised images both hit this.
          if (blob.size >= file.size) return file;
          return toFile(blob, file, outputType);
        }
      }

      dimension = Math.round(dimension * SCALE_FACTOR);
    }

    // Target missed after every attempt. Send the smallest result we produced
    // rather than the untouched original — it is still a large reduction, and
    // the caller's validation decides whether it is acceptable.
    const canvas = drawScaled(bitmap, dimension);
    if (!canvas) return file;

    const last = await toBlob(canvas, outputType, minQuality);
    if (!last || last.size >= file.size) return file;

    return toFile(last, file, outputType);
  } finally {
    if (typeof ImageBitmap !== "undefined" && bitmap instanceof ImageBitmap) {
      bitmap.close();
    }
  }
}

/**
 * Compresses several images, one after another.
 *
 * Sequential on purpose: each image holds a full decoded bitmap plus a canvas
 * of the same dimensions in memory, and doing three at once on a cheap Android
 * is how a tab gets killed mid-upload.
 */
export async function compressImages(
  files: File[],
  options: CompressImageOptions = {},
): Promise<File[]> {
  const output: File[] = [];
  for (const file of files) {
    output.push(await compressImage(file, options));
  }
  return output;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Decodes a file, preferring `createImageBitmap` and falling back to `<img>`. */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image could not be decoded"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draws the bitmap onto a canvas scaled so its longest edge is `maxDimension`. */
function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxDimension: number,
): HTMLCanvasElement | null {
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height =
    "naturalHeight" in source ? source.naturalHeight : source.height;

  if (!width || !height) return null;

  // Only ever scale down. Enlarging a small image adds bytes and no detail.
  const scale = Math.min(1, maxDimension / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Rebuilds a File from the encoded blob, renaming to match the new format. */
function toFile(blob: Blob, original: File, type: string): File {
  const extension = type === OUTPUT_TYPE ? "webp" : "jpg";
  const base = original.name.replace(/\.[^./\\]+$/, "") || "image";

  return new File([blob], `${base}.${extension}`, {
    type,
    lastModified: Date.now(),
  });
}

/** Cached one-pixel encode test — `toBlob` silently falls back to PNG otherwise. */
let webPSupport: Promise<boolean> | null = null;

function supportsWebP(): Promise<boolean> {
  if (webPSupport) return webPSupport;

  webPSupport = new Promise<boolean>((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob(
      (blob) => resolve(blob?.type === OUTPUT_TYPE),
      OUTPUT_TYPE,
      0.8,
    );
  });

  return webPSupport;
}

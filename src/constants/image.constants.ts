/**
 * Image upload limits — the single source of truth.
 */

export const MIN_IMAGE_NUMBER = 1;

/**
 * Maximum images accepted in a single upload, anywhere on the platform.
 */
export const MAX_IMAGE_UPLOAD_COUNT = 3;

/** Maximum size of a single image, in megabytes. The number users are shown. */
export const MAX_IMAGE_FILE_SIZE_MB = 4;

/** Maximum size of a single image, in bytes. The number code compares against. */
export const MAX_IMAGE_FILE_SIZE = MAX_IMAGE_FILE_SIZE_MB * 1024 * 1024;

/**
 * MIME types accepted by the validator and by Cloudinary.
 *
 * Deliberately explicit rather than `image/*`: that wildcard lets an iPhone
 * hand over HEIC, which our pipeline cannot process, and the failure surfaces
 * only after the upload has been sitting there for several seconds.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

/**
 * The `accept` attribute for a file input.
 *
 * Derived from the allow-list rather than written out, so a type added above
 * cannot be silently missing from the file picker.
 */
export const IMAGE_UPLOAD_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

/** Human-readable format list, for prose. Example: "JPEG, PNG or WebP". */
export const ALLOWED_IMAGE_FORMATS_LABEL = "JPEG, PNG or WebP";

// ---------------------------------------------------------------------------
// Payload budget
// ---------------------------------------------------------------------------

/**
 * The total request body we allow ourselves, in bytes.
 */
export const UPLOAD_PAYLOAD_BUDGET = 4 * 1024 * 1024;

/**
 * What each image is compressed down to before it is sent.
 *
 * Derived from the budget rather than chosen, because the constraint is on the
 * request as a whole: {@link MAX_IMAGE_FILE_SIZE} is what a person may *select*
 * (and what the screens state), while this is what actually travels. Three 4MB
 * selections would be a 12MB request and would fail; three compressed images
 * fit inside the budget with room to spare.
 */
export const IMAGE_COMPRESSION_TARGET_BYTES = Math.floor(
  UPLOAD_PAYLOAD_BUDGET / MAX_IMAGE_UPLOAD_COUNT,
);

/**
 * Longest edge, in pixels, an uploaded image is scaled down to.
 *
 * A modern phone photo is 3000-4000px wide; nothing on the platform displays an
 * image larger than a product gallery, so the extra pixels cost upload time and
 * buy nothing. This is what does most of the size reduction — quality
 * adjustment only fine-tunes the result.
 */
export const IMAGE_COMPRESSION_MAX_DIMENSION = 1600;

/**
 * The one sentence every upload screen shows.
 */
export const IMAGE_UPLOAD_HINT = `Up to ${MAX_IMAGE_UPLOAD_COUNT} images · ${ALLOWED_IMAGE_FORMATS_LABEL} · max ${MAX_IMAGE_FILE_SIZE_MB}MB each`;

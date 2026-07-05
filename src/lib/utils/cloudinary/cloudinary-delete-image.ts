import { v2 as cloudinary } from "cloudinary";

/**
 * Result returned by deleteImageFromCloudinary.
 *
 * Designed for batch scripts: never throws, always resolves,
 * so a single failed deletion does not stop the whole process.
 */
export interface CloudinaryDeleteResult {
  success: boolean;
  url: string;
  publicId: string | null;
  error?: string;
}

/**
 * Configures Cloudinary credentials from environment variables.
 */
function configureCloudinary() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Missing required Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Extracts the Cloudinary public_id from a secure image URL.
 *
 * Handles both flat and folder-nested public_ids, e.g.
 *  - https://res.cloudinary.com/<cloud>/image/upload/v123456/abc123.png
 *    -> "abc123"
 *  - https://res.cloudinary.com/<cloud>/image/upload/v123456/products/abc123.png
 *    -> "products/abc123"
 *
 * Assumes the version segment (v followed by digits) is always present,
 * which matches how the existing upload utilities generate URLs.
 *
 * @param url - Cloudinary secure URL
 * @returns The extracted public_id, or null if the URL could not be parsed.
 */
export function extractPublicIdFromUrl(url: string): string | null {
  // Matches everything between /upload/v<digits>/ and the file extension,
  // capturing any folder path in between.
  const match = url.match(/\/upload\/v\d+\/(.+)\.[a-zA-Z0-9]+$/);

  if (!match || !match[1]) {
    return null;
  }

  return match[1];
}

/**
 * Deletes a single image from Cloudinary given its secure URL.
 *
 * This function never throws. It always resolves with a result object,
 * so it is safe to use inside a batch loop (e.g. cleaning up draft products)
 * without one failure stopping the rest of the process.
 *
 * @param url - Cloudinary secure URL of the image to delete
 * @returns Promise<CloudinaryDeleteResult>
 */
export async function deleteImageFromCloudinary(
  url: string,
): Promise<CloudinaryDeleteResult> {
  try {
    configureCloudinary();

    const publicId = extractPublicIdFromUrl(url);

    if (!publicId) {
      return {
        success: false,
        url,
        publicId: null,
        error: `Could not extract public_id from URL: ${url}`,
      };
    }

    const result = await cloudinary.uploader.destroy(publicId);

    // Cloudinary returns { result: "ok" } on success and
    // { result: "not found" } if the asset doesn't exist.
    if (result.result !== "ok") {
      return {
        success: false,
        url,
        publicId,
        error: `Cloudinary returned "${result.result}" for public_id: ${publicId}`,
      };
    }

    return {
      success: true,
      url,
      publicId,
    };
  } catch (error) {
    return {
      success: false,
      url,
      publicId: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

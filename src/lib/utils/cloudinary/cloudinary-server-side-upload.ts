import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

/**
 * Uploads product image files to Cloudinary from the server.
 *
 * This helper is designed specifically for files received from:
 * `await request.formData()` inside a Next.js App Router route.
 *
 * Flow:
 * - Accepts an array of Web API `File` objects
 * - Converts each file into an ArrayBuffer
 * - Converts the ArrayBuffer into a Node.js Buffer
 * - Streams the buffer directly to Cloudinary
 * - Returns an array of secure image URLs
 *
 * Why Buffer conversion is needed:
 * Cloudinary's Node SDK upload stream accepts Node streams/buffers,
 * while `request.formData()` provides Web API File objects.
 *
 * @param files - Image files extracted from `FormData`
 * @returns Promise<string[]> - Array of uploaded Cloudinary secure URLs
 */
export async function uploadProductImages(files: File[]): Promise<string[]> {
  // If no images were provided, return an empty array immediately.
  if (!files.length) return [];

  // Upload all images in parallel for faster performance.
  const uploaded = await Promise.all(
    files.map(async (file) => {
      // Convert the Web API File into raw binary bytes.
      const bytes = await file.arrayBuffer();

      // Convert binary bytes into a Node.js Buffer
      // so Cloudinary can consume it as a stream.
      const buffer = Buffer.from(bytes);

      return new Promise<string>((resolve, reject) => {
        // Create Cloudinary upload stream.
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "products",
          },
          (error, result) => {
            // If upload fails, reject immediately.
            if (error || !result) {
              reject(error || new Error("Image upload failed"));
              return;
            }

            // Return the secure Cloudinary URL.
            resolve(result.secure_url);
          },
        );

        // Convert the buffer into a readable stream
        // and pipe it directly into Cloudinary.
        streamifier.createReadStream(buffer).pipe(stream);
      });
    }),
  );

  return uploaded;
}

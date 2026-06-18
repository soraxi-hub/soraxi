import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { AppError } from "@/lib/errors/app-error";

export async function POST() {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Server configuration error: Missing required Cloudinary environment variables",
      );
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp: timestamp },
      process.env.CLOUDINARY_API_SECRET!,
    );

    return NextResponse.json(
      { message: "successful", timestamp, signature },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

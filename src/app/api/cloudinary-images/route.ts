import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { handleApiError } from "@/lib/utils/handle-api-error";

export async function POST() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("Missing required environment variables");
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing required Cloudinary environment variables",
      },
      { status: 500 }
    );
  }
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp: timestamp },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json(
      { message: `successfull`, timestamp, signature },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

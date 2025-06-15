import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";

/**
 * Handles errors thrown in API routes and formats the response.
 * Supports both custom AppError instances and unexpected errors.
 */
export function handleApiError(error: unknown) {
  console.error("API Error:", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code || "APP_ERROR",
          cause: error.cause || null,
        },
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      error: {
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}

import { NextResponse } from "next/server";
import { AppError, AppErrorCode } from "@/lib/errors/app-error";

/**
 * Maps a standardized AppErrorCode to the corresponding HTTP status code.
 *
 * This ensures consistent translation between domain-level errors
 * and HTTP response semantics for REST API routes.
 *
 * @param code - The internal application error code.
 * @returns The appropriate HTTP status code.
 */
export function mapErrorCodeToHttpStatus(code: AppErrorCode): number {
  switch (code) {
    case "BAD_REQUEST":
    case "PARSE_ERROR":
    case "UNPROCESSABLE_CONTENT":
    case "PAYLOAD_TOO_LARGE":
    case "UNSUPPORTED_MEDIA_TYPE":
    case "PRECONDITION_REQUIRED":
      return 400;

    case "UNAUTHORIZED":
    case "PAYMENT_REQUIRED":
      return 401;

    case "FORBIDDEN":
      return 403;

    case "NOT_FOUND":
      return 404;

    case "METHOD_NOT_SUPPORTED":
      return 405;

    case "CONFLICT":
      return 409;

    case "PRECONDITION_FAILED":
      return 412;

    case "TOO_MANY_REQUESTS":
      return 429;

    case "CLIENT_CLOSED_REQUEST":
      return 499;

    case "BAD_GATEWAY":
    case "SERVICE_UNAVAILABLE":
    case "GATEWAY_TIMEOUT":
    case "INTERNAL_SERVER_ERROR":
    case "NOT_IMPLEMENTED":
    case "TIMEOUT":
    default:
      return 500;
  }
}

/**
 * Handles errors thrown inside Next.js API routes and normalizes them
 * into a consistent JSON HTTP response format.
 *
 * - If the error is an AppError, it maps the error code to an HTTP status
 *   and returns a structured response.
 * - If the error is unknown, it returns a generic 500 response.
 *
 * This function acts as the central error boundary for REST API routes.
 *
 * @param error - The thrown error (can be any type).
 * @returns A NextResponse JSON object representing the error response.
 */
export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          meta: error.meta ?? null,
        },
      },
      {
        status: mapErrorCodeToHttpStatus(error.code),
      },
    );
  }

  return NextResponse.json(
    {
      error: {
        message: "An unexpected error occurred",
        code: "INTERNAL_SERVER_ERROR",
      },
    },
    { status: 500 },
  );
}

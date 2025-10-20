import { TRPCError } from "@trpc/server";

/**
 * @function handleTRPCError
 * @description
 * Centralized TRPC error handler. It standardizes all thrown errors into TRPCError instances.
 * Detects and classifies network, validation, and database connection errors.
 *
 * @param error - The caught error object.
 * @param defaultMessage - Fallback message for unexpected errors.
 * @returns A standardized TRPCError instance.
 */
export function handleTRPCError(
  error: unknown,
  defaultMessage = "Unexpected server error"
): TRPCError {
  // ✅ If it's already a TRPCError, rethrow it as-is
  if (error instanceof TRPCError) {
    return error;
  }

  // ✅ Convert known Mongoose / MongoDB connection errors
  if (
    error instanceof Error &&
    (error.name === "MongoNetworkError" ||
      error.name === "MongooseServerSelectionError" ||
      error.message?.includes("ECONNREFUSED") ||
      error.message?.includes("ETIMEDOUT") ||
      error.message?.includes("EHOSTUNREACH") ||
      error.message?.includes("ENOTFOUND") ||
      error.message?.includes("getaddrinfo") ||
      error.message?.includes("failed to connect to server"))
  ) {
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database connection error. Please try again later.",
      cause: error,
    });
  }

  // ✅ Handle common validation issues
  if (error instanceof Error && error.name === "ValidationError") {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message || "Invalid data provided.",
      cause: error,
    });
  }

  // ✅ Handle duplicate key (MongoDB unique constraint violation)
  if ((error as any)?.code === 11000) {
    return new TRPCError({
      code: "CONFLICT",
      message: "Duplicate entry detected. Please use unique values.",
      cause: error,
    });
  }

  // ✅ Default fallback
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      error instanceof Error && error.message ? error.message : defaultMessage,
    cause: error,
  });
}

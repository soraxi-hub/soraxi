import { TRPCError } from "@trpc/server";
import { MongoNetworkError, MongoServerSelectionError } from "mongodb";
import { AppError } from "../errors/app-error";

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
  defaultMessage = "Unexpected server error",
): TRPCError {
  // If it's already a TRPCError, rethrow it as-is
  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof AppError) {
    // `return`, not `throw`. Every other branch returns, and the signature
    // promises a TRPCError rather than a raised one. Throwing happened to look
    // identical at the call sites, which all write
    // `throw handleTRPCError(...)`, so the inconsistency was invisible — but
    // it made this the one input that could not be inspected without a
    // try/catch.
    return new TRPCError({
      code: error.code,
      message: error.message,
      cause: error,
    });
  }

  /*
   * Convert known Mongoose / MongoDB connection errors.
   *
   * This tests `instanceof`, not `error.name`. The driver's transient errors
   * subclass `MongoNetworkError` but override `name` with their own string —
   * `PoolClearedError`, for one, extends `MongoNetworkError` yet reports
   * `name === "MongoPoolClearedError"`. A name-equality check therefore misses
   * every subclass and drops the error into the fallback below, which is how
   * a raw connection-pool message reached a customer's screen.
   *
   * The string checks are kept for driver-agnostic errno cases (a DNS or
   * socket failure raised outside the driver), with `timed out` added since
   * the driver phrases timeouts in prose rather than as an errno.
   */
  const isConnectivityError =
    error instanceof MongoNetworkError ||
    error instanceof MongoServerSelectionError ||
    (error instanceof Error &&
      (error.name === "MongooseServerSelectionError" ||
        error.message?.includes("ECONNREFUSED") ||
        error.message?.includes("ETIMEDOUT") ||
        error.message?.includes("EHOSTUNREACH") ||
        error.message?.includes("ENOTFOUND") ||
        error.message?.includes("getaddrinfo") ||
        error.message?.includes("timed out") ||
        error.message?.includes("failed to connect to server")));

  if (isConnectivityError) {
    return new TRPCError({
      // 503, not 500: these are transient and worth retrying, and the code is
      // what tells the client whether "Try Again" is honest advice.
      code: "SERVICE_UNAVAILABLE",
      message:
        "We couldn't reach our database just now. Please try again in a moment.",
      cause: error,
    });
  }

  // Handle common validation issues
  if (error instanceof Error && error.name === "ValidationError") {
    // Mongoose phrases these in terms of schema paths ("Path `storeEmail` is
    // required"), which is both meaningless to a user and a description of our
    // data model. Inputs are validated by zod at the procedure boundary long
    // before this, so reaching here means something internal is malformed.
    return new TRPCError({
      code: "BAD_REQUEST",
      message: "Some of the information provided is invalid.",
      cause: error,
    });
  }

  // Handle duplicate key (MongoDB unique constraint violation)
  if ((error as any)?.code === 11000) {
    return new TRPCError({
      code: "CONFLICT",
      message: "Duplicate entry detected. Please use unique values.",
      cause: error,
    });
  }

  /*
   * Default fallback.
   *
   * This branch exists precisely for errors we did not anticipate, so it is
   * the last place that should repeat one verbatim. It previously returned
   * `error.message`, which meant any unrecognised library error was rendered
   * to the user as-is; `defaultMessage` only applied to non-Errors, making the
   * argument almost dead code.
   *
   * The original error is preserved as `cause` for logging and for the
   * errorFormatter, which is where the decision to mask is enforced.
   */
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: defaultMessage,
    cause: error,
  });
}

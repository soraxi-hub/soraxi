export type AppErrorCode =
  | "NOT_FOUND"
  | "PARSE_ERROR"
  | "BAD_REQUEST"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_IMPLEMENTED"
  | "BAD_GATEWAY"
  | "SERVICE_UNAVAILABLE"
  | "GATEWAY_TIMEOUT"
  | "UNAUTHORIZED"
  | "PAYMENT_REQUIRED"
  | "FORBIDDEN"
  | "METHOD_NOT_SUPPORTED"
  | "TIMEOUT"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UNPROCESSABLE_CONTENT"
  | "PRECONDITION_REQUIRED"
  | "TOO_MANY_REQUESTS"
  | "CLIENT_CLOSED_REQUEST";

/**
 * Standardized application error used across domain, REST, and tRPC layers.
 *
 * AppError enforces consistent error handling by combining:
 * - A machine-readable error `code`
 * - A human-readable `message`
 * - Optional structured `meta` data for debugging or context
 *
 * This error is designed to be:
 * - Thrown in domain and service layers
 * - Translated into HTTP responses in REST APIs
 * - Converted into TRPCError in tRPC handlers
 *
 * @typeParam T - Optional metadata type for additional error context.
 */
export class AppError<T = unknown> extends Error {
  /**
   * Creates a new AppError instance.
   *
   * @param code - A standardized application error code representing the error type.
   * @param message - A human-readable description of the error.
   * @param meta - Optional additional structured data for debugging or context.
   */
  constructor(
    public code: AppErrorCode,
    message: string,
    public meta?: T,
  ) {
    super(message);
    this.name = "AppError";

    // Improves stack trace readability in Node.js environments
    Error.captureStackTrace?.(this, this.constructor);
  }
}

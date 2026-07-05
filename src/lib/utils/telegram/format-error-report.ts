import { TRPCError } from "@trpc/server";
import { AppError, type AppErrorCode } from "@/lib/errors/app-error";

// AppErrorCode / TRPC_ERROR_CODE_KEY values that represent genuine server-side
// failures rather than deliberate control-flow (validation, auth, not-found).
// Only these are worth waking someone up for.
const UNEXPECTED_ERROR_CODES: ReadonlySet<AppErrorCode> = new Set([
  "INTERNAL_SERVER_ERROR",
  "BAD_GATEWAY",
  "SERVICE_UNAVAILABLE",
  "GATEWAY_TIMEOUT",
  "NOT_IMPLEMENTED",
  "TIMEOUT",
]);

// Raw (unwrapped) error names that some call sites classify as a 400
// themselves before converting to AppError/TRPCError — e.g. Mongoose
// ValidationError/CastError from malformed input reaching a query. Treated
// as expected/control-flow, same as handleTRPCError already does for
// ValidationError.
const EXPECTED_RAW_ERROR_NAMES = new Set(["ValidationError", "CastError"]);

/**
 * Decides whether an error is worth reporting to Telegram.
 *
 * Deliberate control-flow errors (zod/validation, auth rejections, 404s,
 * conflicts, rate limits — anything that maps to a 4xx) are expected and
 * are excluded. Anything else — DB/Mongo errors, external API failures,
 * unclassified exceptions — is reported.
 */
export function isReportableError(err: unknown): boolean {
  if (err instanceof AppError) {
    return UNEXPECTED_ERROR_CODES.has(err.code);
  }
  if (err instanceof TRPCError) {
    return UNEXPECTED_ERROR_CODES.has(err.code as AppErrorCode);
  }
  if (err instanceof Error && EXPECTED_RAW_ERROR_NAMES.has(err.name)) {
    return false;
  }
  return true;
}

const STACK_TRACE_BUDGET = 3000;

/**
 * Builds a plain-text (no Markdown) Telegram report for an unexpected error.
 * Reuse this everywhere reporting is wired in so reports stay consistent.
 */
export function formatErrorReport(
  err: unknown,
  opts: { source: string },
): string {
  const environment = process.env.VERCEL_ENV ?? "local";
  const name = err instanceof Error ? err.name : "UnknownError";
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error && err.stack ? err.stack : "(no stack trace)";
  const truncatedStack =
    stack.length > STACK_TRACE_BUDGET
      ? stack.slice(0, STACK_TRACE_BUDGET) + "\n...[truncated]"
      : stack;

  return [
    "🚨 Soraxi error",
    `Environment: ${environment}`,
    `Source: ${opts.source}`,
    `Error: ${name}: ${message}`,
    "Stack:",
    truncatedStack,
  ].join("\n");
}

/**
 * Builds a plain-text Telegram report for a routine (non-error) cron job
 * completion summary. `status` controls the header so discrepancy-bearing
 * runs are visually distinct from clean ones.
 */
export function formatCronSummary(
  source: string,
  lines: string[],
  status: "ok" | "attention" = "ok",
): string {
  const environment = process.env.VERCEL_ENV ?? "local";
  const header =
    status === "ok" ? "✅ Soraxi cron summary" : "⚠️ Soraxi cron summary";

  return [header, `Environment: ${environment}`, `Source: ${source}`, ...lines].join(
    "\n",
  );
}

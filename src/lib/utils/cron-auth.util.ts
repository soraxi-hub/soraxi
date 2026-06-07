import { NextRequest } from "next/server";

/**
 * Verifies that an incoming request to a cron API route
 * was made by Vercel's cron scheduler and not an external actor.
 *
 * Vercel automatically injects the Authorization header with the
 * CRON_SECRET environment variable on every scheduled invocation.
 *
 * Usage:
 *   const authError = verifyCronRequest(request);
 *   if (authError) return authError;
 *
 * @param request - The incoming Next.js request
 * @returns A 401 Response if verification fails, null if it passes
 */
export function verifyCronRequest(request: NextRequest): Response | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[CronAuth] CRON_SECRET environment variable is not set.");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server configuration error: CRON_SECRET is not set.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split("Bearer ")?.[1];

  if (!token || token !== cronSecret) {
    console.warn("[CronAuth] Unauthorized cron request blocked.");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unauthorized.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  return null;
}

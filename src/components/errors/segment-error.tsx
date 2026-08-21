"use client";

import { useEffect, useState } from "react";
import { ErrorFallback } from "./error-fallback";

/**
 * Props Next.js passes to a route segment's `error.tsx`. The names are fixed
 * by the framework: `reset` re-renders the segment in place, which is cheaper
 * and less destructive than a full document reload.
 */
export interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Adapter between the Next.js `error.tsx` contract and the shared
 * `ErrorFallback` used by every client `ErrorBoundary` in the app.
 *
 * Every segment boundary renders this so route errors and client render
 * errors look and behave the same. Two things only a route boundary knows are
 * folded in here:
 *
 * - **`digest`** — in production Next replaces a Server Component's message
 *   with a generic one and exposes this token instead. It is the route-level
 *   equivalent of the tRPC `ref`, so it is surfaced the same way: something
 *   the user can quote to support that correlates to a server log line.
 * - **offline state** — a dead connection produces errors whose messages say
 *   nothing useful, so it is detected directly rather than inferred.
 *
 * The raw `error.message` is deliberately never rendered. `GenericError`
 * enforces that, and routing through it is what keeps the guarantee.
 */
export function SegmentError({ error, reset }: SegmentErrorProps) {
  // Read after mount, not during render: the server has no `navigator`, and
  // branching on it inline would desync the first client paint.
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const sync = () => setIsOffline(!navigator.onLine);
    sync();

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    // The boundary is the last place this error is visible to us; without
    // this it is swallowed into a fallback and never reported.
    console.error("[segment-error]", { digest: error.digest, error });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      resetErrorBoundary={reset}
      reference={error.digest}
      supportEmail={process.env.NEXT_PUBLIC_SORAXI_SUPPORT_EMAIL}
      forceNetworkError={isOffline}
    />
  );
}

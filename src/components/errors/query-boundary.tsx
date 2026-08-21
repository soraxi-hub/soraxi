"use client";

import type { ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./error-fallback";

/**
 * The client-side error boundary for any subtree that fetches with tRPC or
 * React Query.
 *
 * A bare `<ErrorBoundary>` is not enough here. When a `useSuspenseQuery`
 * rejects, React Query caches the rejection against the query key. Resetting
 * only the boundary re-renders the same subtree, the same query is read back
 * from cache in its error state, and it throws again on the spot — so the
 * fallback reappears and "Try Again" looks broken.
 *
 * `QueryErrorResetBoundary` supplies the matching half: its `reset` clears the
 * error state of the queries beneath it. Wiring it to the boundary's `onReset`
 * makes the two happen together, which is what makes a retry actually retry.
 *
 * Note this catches *client* render errors only. Errors thrown while an async
 * Server Component renders never reach it — those belong to the segment's
 * `error.tsx`.
 */
export function QueryBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallback}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

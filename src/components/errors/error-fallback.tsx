"use client";

import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/trpc/routers/_app";
import { NetworkError } from "./network-error";
import { UnauthorizedError } from "./unauthorized-error";
import { NotFoundError } from "./not-found-error";
import { GenericError } from "./generic-error";

interface ErrorFallbackProps {
  error?: Error | TRPCClientErrorLike<AppRouter>;
  resetErrorBoundary?: () => void;
  /** Correlation token for callers outside tRPC — see `GenericError`. */
  reference?: string;
  /** When set, the generic branch offers a mailto escape hatch. */
  supportEmail?: string;
  /**
   * Forces the network branch regardless of the error's shape. Route-level
   * callers know things the error does not, such as `navigator.onLine`.
   */
  forceNetworkError?: boolean;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
  reference,
  supportEmail,
  forceNetworkError,
}: ErrorFallbackProps) {
  const errorCode =
    (forceNetworkError && "NETWORK_ERROR") ||
    (error as any)?.data?.code ||
    (error as any)?.code ||
    (error?.message?.includes("NETWORK_ERROR") && "NETWORK_ERROR") ||
    (error?.message?.includes("UNAUTHORIZED") && "UNAUTHORIZED") ||
    (error?.message?.includes("NOT_FOUND") && "NOT_FOUND") ||
    "UNKNOWN_ERROR";

  const handleRetry = () => {
    if (resetErrorBoundary) resetErrorBoundary();
    else window.location.reload();
  };

  switch (errorCode) {
    case "NETWORK_ERROR":
      return <NetworkError onRetry={handleRetry} />;
    case "UNAUTHORIZED":
      return <UnauthorizedError onRetry={handleRetry} />;
    case "NOT_FOUND":
      return <NotFoundError />;
    default:
      return (
        <GenericError
          onRetry={handleRetry}
          error={error}
          reference={reference}
          supportEmail={supportEmail}
        />
      );
  }
}

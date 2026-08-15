"use client";

import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/trpc/routers/_app";
import { NetworkError } from "@/components/errors/network-error";
import { UnauthorizedError } from "@/components/errors/unauthorized-error";
import { NotFoundError } from "@/components/errors/not-found-error";
import { GenericError } from "@/components/errors/generic-error";

interface ErrorFallbackProps {
  error?: Error | TRPCClientErrorLike<AppRouter>;
  resetErrorBoundary?: () => void;
}

export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  /*
   * Prefer the structured code. The substring checks are a last resort for
   * errors thrown outside tRPC, and are deliberately last: matching on message
   * text misroutes any error whose message merely quotes one of these words.
   */
  const errorCode =
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
    // `NetworkError` keeps its own copy. Forwarding `error.message` here used
    // to put the raw text on screen by a second route, past whatever the
    // generic branch filtered.
    case "NETWORK_ERROR":
      return <NetworkError onRetry={handleRetry} />;
    case "UNAUTHORIZED":
      return <UnauthorizedError onRetry={handleRetry} />;
    case "NOT_FOUND":
      return <NotFoundError />;
    default:
      return <GenericError onRetry={handleRetry} error={error} />;
  }
}

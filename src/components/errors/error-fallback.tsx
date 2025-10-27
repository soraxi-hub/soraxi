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
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
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

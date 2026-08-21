"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Mail, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/trpc/routers/_app";

interface GenericErrorProps {
  error?: Error | TRPCClientErrorLike<AppRouter>;
  onRetry?: () => void;
  /**
   * Correlation token from a caller that has one but did not route it through
   * tRPC — a Next.js route `error.tsx` passing `error.digest`. Takes
   * precedence over the tRPC `ref`; both mean the same thing to support.
   */
  reference?: string;
  /** When set, offers a mailto escape hatch alongside the retry. */
  supportEmail?: string;
}

const FALLBACK_MESSAGE = "Something went wrong on our end. Please try again.";

/**
 * Messages reaching this component come from the tRPC error formatter, which
 * substitutes generic text for anything it cannot prove was written for a
 * user. Errors thrown outside tRPC have no such guarantee, so a raw
 * `Error.message` — a driver's, a library's — is never rendered here.
 *
 * The `ref` is a short correlation token matching a server log line. It gives
 * the user something concrete to quote to support and gives support something
 * to search, which is what the raw message was accidentally providing before.
 */
export function GenericError({
  error,
  onRetry,
  reference,
  supportEmail,
}: GenericErrorProps) {
  const data = (error as TRPCClientErrorLike<AppRouter> | undefined)?.data as
    | { ref?: string }
    | undefined;

  // Only trust a message that arrived through the tRPC pipeline; anything else
  // is an unfiltered runtime error.
  const message = data
    ? (error?.message ?? FALLBACK_MESSAGE)
    : FALLBACK_MESSAGE;
  const ref = reference ?? data?.ref;

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Something Went Wrong</CardTitle>
          <CardDescription className="break-words text-wrap">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={onRetry}
            className="w-full bg-soraxi-green-hover text-white hover:bg-soraxi-green-hover"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          {supportEmail && (
            <Button asChild variant="ghost" className="w-full">
              <Link href={`mailto:${supportEmail}`}>
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </Link>
            </Button>
          )}

          {ref && (
            <p className="text-xs text-muted-foreground">
              If this keeps happening, quote reference{" "}
              <span className="font-mono font-medium">{ref}</span> to support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

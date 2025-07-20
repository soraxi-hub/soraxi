"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, RefreshCw, Mail } from "lucide-react";
import Link from "next/link";

interface WishlistErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export function WishlistErrorFallback({
  error,
  resetErrorBoundary,
}: WishlistErrorFallbackProps) {
  const isNetworkError =
    error?.message?.includes("fetch") || error?.message?.includes("network");
  const isAuthError =
    error?.message?.includes("unauthorized") ||
    error?.message?.includes("auth");

  return (
    <div className="flex items-center justify-center min-h-[500px] p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />

            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600">
                {isNetworkError &&
                  "We're having trouble connecting to our servers."}
                {isAuthError && "There was an authentication issue."}
                {!isNetworkError &&
                  !isAuthError &&
                  "An unexpected error occurred while loading your wishlist."}
              </p>
            </div>

            {process.env.NODE_ENV === "development" && error && (
              <details className="text-left bg-gray-100 p-3 rounded text-sm">
                <summary className="cursor-pointer font-medium">
                  Error Details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap">{error.message}</pre>
                {error.stack && (
                  <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {resetErrorBoundary && (
                <Button
                  onClick={resetErrorBoundary}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}

              <Button variant="outline" asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>

              <Button variant="ghost" asChild>
                <Link href="/contact" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

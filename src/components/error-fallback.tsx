"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Mail } from "lucide-react";
import Link from "next/link";

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  // Prepare email link with pre-filled error details
  const supportEmail =
    process.env.NEXT_PUBLIC_SORAXI_SUPPORT_EMAIL || "mishaeljoe55@gmail.com";
  const mailtoLink = `mailto:${supportEmail}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-red-600 mb-6">
          {error?.message || "An unexpected error occurred."}
        </p>

        <div className="flex items-center justify-center gap-3">
          {resetErrorBoundary && (
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="bg-transparent text-red-700 hover:bg-red-100 hover:underline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          <Button
            asChild
            variant="secondary"
            className="bg-transparent text-red-700 hover:bg-red-100 hover:underline"
          >
            <Link href={mailtoLink}>
              <Mail className="h-4 w-4 mr-2" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

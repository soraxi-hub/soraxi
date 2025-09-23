"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircleIcon,
  MailIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const supportEmail =
    process.env.NEXT_PUBLIC_SORAXI_SUPPORT_EMAIL || "mishaeljoe55@gmail.com";
  const mailtoLink = `mailto:${supportEmail}`;

  // 🔹 Detect network issue (from server or client)
  const isNetworkError =
    error?.message === "NETWORK_ERROR" ||
    (typeof window !== "undefined" && !navigator.onLine);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md w-full">
        {isNetworkError ? (
          <WifiOffIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        ) : (
          <AlertCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        )}

        <h2 className="text-xl font-semibold text-red-800 mb-2">
          {isNetworkError ? "Network Connection Issue" : "Something went wrong"}
        </h2>

        <p className="text-red-600 mb-6">
          {isNetworkError
            ? "Please check your internet connection and try again."
            : error?.message || "An unexpected error occurred."}
        </p>

        <div className="flex items-center justify-center gap-3">
          {reset && (
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="bg-transparent text-red-700 hover:bg-red-50 hover:underline"
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {!isNetworkError && (
            <Button
              asChild
              variant="secondary"
              className="bg-transparent text-red-700 hover:bg-red-50 hover:underline"
            >
              <Link href={mailtoLink}>
                <MailIcon className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

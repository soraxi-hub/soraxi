"use client";

import React from "react";
import { CheckCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SubmitSuccessProps {
  referenceId: string;
  email: string;
}

export const SubmitSuccess: React.FC<SubmitSuccessProps> = ({
  referenceId,
  email,
}) => {
  const router = useRouter();
  const handleCopy = () => {
    navigator.clipboard.writeText(referenceId);
    toast.success("Reference ID copied to clipboard");
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#14a800]/10">
        <CheckCircle className="w-10 h-10 text-[#14a800]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Application Submitted!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          We&apos;ve received your application and will review it shortly. Check{" "}
          <span className="font-medium text-gray-900 dark:text-white">
            {email}
          </span>{" "}
          for a confirmation email.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm text-gray-500">Your reference ID</p>
          <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
            <span className="font-mono text-base font-semibold text-gray-900 dark:text-white tracking-wider">
              {referenceId}
            </span>
            <button
              onClick={handleCopy}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              title="Copy reference ID"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Save this ID. You can use it with your email to check your
            application status.{" "}
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/store/waitlist/status`}
              className="hover:text-soraxi-green-hover"
            >
              view application status.
            </Link>
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button
          variant="outline"
          onClick={() => router.push("/store/waitlist/status")}
        >
          Check Status
        </Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
};

SubmitSuccess.displayName = "SubmitSuccess";

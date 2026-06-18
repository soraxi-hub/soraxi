"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

type ApplicationStatus = "pending" | "approved" | "rejected" | "invited";

const STATUS_CONFIG: Record<
  ApplicationStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    color: string;
    badgeVariant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: {
    label: "Under Review",
    icon: Clock,
    description:
      "Your application has been received and is currently being reviewed by our team. This usually takes 3–5 business days.",
    color: "text-amber-500",
    badgeVariant: "secondary",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    description:
      "Congratulations! Your application has been approved. Check your email for your invite link to create your store.",
    color: "text-[#14a800]",
    badgeVariant: "default",
  },
  invited: {
    label: "Invite Sent",
    icon: CheckCircle,
    description:
      "Your invite link has been sent. If you haven't set up your store yet, check your email for the onboarding link.",
    color: "text-[#14a800]",
    badgeVariant: "default",
  },
  rejected: {
    label: "Not Approved",
    icon: XCircle,
    description:
      "Unfortunately your application was not approved at this time. For further clarification, feel free to reach out to our support team.",
    color: "text-red-500",
    badgeVariant: "destructive",
  },
};

export function WaitlistStatusPage() {
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const statusQuery = useQuery(
    trpc.waitlist.checkStatus.queryOptions(
      { email: email.trim(), referenceId: referenceId.trim() },
      {
        enabled: false, // manually triggered
        retry: false,
      },
    ),
  );

  const handleCheck = async () => {
    if (!email.trim() || !referenceId.trim()) return;
    setHasSearched(true);
    statusQuery.refetch();
  };

  const status = statusQuery.data;
  const config = status
    ? STATUS_CONFIG[status.status as ApplicationStatus]
    : null;

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Check Application Status
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email and reference ID to see where your application
            stands.
          </p>
        </div>

        {/* Lookup form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Application Lookup</CardTitle>
            <CardDescription>
              Both fields are required. Your reference ID was sent to your email
              after you applied.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="statusEmail">Email Address</Label>
              <Input
                id="statusEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={statusQuery.isFetching}
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceId">Reference ID</Label>
              <Input
                id="referenceId"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                placeholder="SRX-2025-00042"
                disabled={statusQuery.isFetching}
                className="h-11 border-gray-200 focus:border-[#14a800] focus:ring-[#14a800] font-mono"
              />
            </div>

            <Button
              onClick={handleCheck}
              disabled={
                !email.trim() || !referenceId.trim() || statusQuery.isFetching
              }
              className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
            >
              {statusQuery.isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                "Check Status"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        {hasSearched && !statusQuery.isFetching && (
          <>
            {statusQuery.error && (
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        No application found
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        We couldn&apos;t find an application matching those
                        details. Double-check your email and reference ID.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {status && config && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {status.businessName}
                    </p>
                    <Badge variant={config.badgeVariant}>{config.label}</Badge>
                  </div>

                  <div className="flex items-start gap-3">
                    <config.icon
                      className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`}
                    />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {config.description}
                    </p>
                  </div>

                  {/* Rejection reason */}
                  {/* {status.status === "rejected" && status.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                        Reason:
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {status.rejectionReason}
                      </p>
                    </div>
                  )} */}

                  <p className="text-xs text-gray-400">
                    Applied{" "}
                    {new Date(status.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

WaitlistStatusPage.displayName = "WaitlistStatusPage";

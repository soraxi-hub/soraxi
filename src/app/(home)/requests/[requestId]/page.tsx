"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, ArrowLeft, CheckCircle2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { use } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import RequestDetailSkeleton from "@/modules/skeletons/request-details-skeleton";
import { RequestNotFound } from "@/modules/requests/components/request-not-found";

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const resolvedParams = use(params);
  const trpc = useTRPC();
  const { data: requestData, isLoading } = useQuery(
    trpc.demandListing.getRequestById.queryOptions(resolvedParams),
  );

  if (isLoading) {
    return <RequestDetailSkeleton />;
  }

  if (!requestData || requestData.request === null) {
    return <RequestNotFound />;
  }

  const request = requestData.request;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto py-8 px-6 md:px-8">
        {/* Back Button */}
        <Link href="/requests">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Marketplace
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="p-8 border-l-4 border-l-soraxi-green">
              <div className="space-y-4">
                {/* Title and Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      {request.title}
                    </h1>
                    <div className="flex items-center gap-2">
                      {request.status === "open" && (
                        <Badge className="bg-soraxi-green text-white">
                          Open
                        </Badge>
                      )}
                      {request.status === "fulfilled" && (
                        <Badge className="bg-green-100">
                          <CheckCircle2Icon className="w-3 h-3 mr-1" />
                          Fulfilled
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta Information */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Posted{" "}
                      {formatDistanceToNow(new Date(request.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {request.budgetMin || request.budgetMax ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {request.budgetMin && request.budgetMax
                          ? `${formatNaira(request.budgetMin)} - ${formatNaira(request.budgetMax)}`
                          : request.budgetMin
                            ? `${formatNaira(request.budgetMin)}+`
                            : `Up to ${formatNaira(request.budgetMax!)}`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Details</h2>
              <p className="text-foreground leading-relaxed">
                {request.description}
              </p>

              {/* Categories */}
              {request.category && request.category.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-2">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {request.category.map((cat) => (
                      <Badge key={cat} variant="outline">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4 space-y-4">
              <h2 className="font-semibold text-foreground">
                About this request
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                    Budget
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {request.budgetMin && request.budgetMax
                      ? `${formatNaira(request.budgetMin)} - ${formatNaira(request.budgetMax)}`
                      : request.budgetMin
                        ? `${formatNaira(request.budgetMin)}+`
                        : "Not specified"}
                  </p>
                </div>

                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">
                    Status
                  </p>
                  <Badge
                    variant={
                      request.status === "open" ? "default" : "secondary"
                    }
                    className={
                      request.status === "open"
                        ? "bg-soraxi-green text-white"
                        : ""
                    }
                  >
                    {request.status.charAt(0).toUpperCase() +
                      request.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

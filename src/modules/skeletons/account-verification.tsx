"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountVerificationSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-soraxi-green/20 rounded-2xl dark:bg-muted/50">
        <CardHeader className="text-center space-y-2">
          {/* Title */}
          <Skeleton className="h-6 w-40 mx-auto" />
          {/* Description */}
          <Skeleton className="h-4 w-64 mx-auto" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OTP Input Section */}
          <div className="flex justify-center">
            <div className="grid grid-cols-6 gap-2 w-full">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-square w-full h-12 rounded-lg"
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Verify button */}
            <Skeleton className="h-10 w-full rounded-md" />
            {/* Resend link */}
            <div className="flex justify-center">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateStoreSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          {/* Logo */}
          <div className="flex justify-center">
            <Skeleton className="w-12 h-12 rounded-lg" />
          </div>
          {/* Title */}
          <Skeleton className="h-6 w-48 mx-auto" />
          {/* Subtitle */}
          <Skeleton className="h-4 w-72 mx-auto" />
        </div>

        {/* Card */}
        <Card className="dark:bg-muted/50">
          <CardHeader>
            <CardTitle>
              <Skeleton className="h-5 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-64 mt-2" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store Name */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>

            {/* Store Email */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-56" />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Submit Button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>

        {/* Bottom Alert */}
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    </div>
  );
}

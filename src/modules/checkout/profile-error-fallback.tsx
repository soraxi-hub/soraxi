"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserX, RefreshCw } from "lucide-react";

export function ProfileErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      {/* Icon section */}
      <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <UserX className="h-12 w-12 text-destructive" />
      </div>

      {/* Headings */}
      <h2 className="text-2xl font-semibold mb-2">Profile Not Found</h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        We couldn’t load your profile information. Please refresh the page or
        update your details in your account settings.
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" asChild>
          <Link href="/cart">
            <RefreshCw className="h-4 w-4 mr-2" />
            Return to Cart
          </Link>
        </Button>
        <Button
          asChild
          className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
        >
          <Link href="/profile">Update Profile</Link>
        </Button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export function RequestNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <Card className="max-w-md w-full text-center p-8 space-y-4">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-soraxi-green/20 rounded-full flex items-center justify-center mx-auto">
            <SearchX className="w-8 h-8 text-soraxi-green" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            Request not found
          </h2>

          <p className="text-sm text-muted-foreground">
            The request you’re looking for may have been removed, fulfilled, or
            the link might be incorrect.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/requests">
            <Button className="w-full sm:w-auto bg-soraxi-green text-white hover:bg-soraxi-green-hover">
              Browse Requests
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

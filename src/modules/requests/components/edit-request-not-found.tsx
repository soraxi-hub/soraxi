"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function EditRequestNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30">
      <Card className="p-12 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold text-foreground">
          Request Not Found
        </h2>
        <p className="text-sm text-muted-foreground">
          Sorry, the request you are trying to edit does not exist or has been
          removed.
        </p>
        <Link href="/requests">
          <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white gap-2">
            Go Back to Marketplace
          </Button>
        </Link>
      </Card>
    </div>
  );
}

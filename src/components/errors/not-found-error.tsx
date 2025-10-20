"use client";

import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function NotFoundError() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <SearchX className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Resource Not Found</CardTitle>
          <CardDescription>
            The item you’re looking for doesn’t exist or was removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            asChild
            className="w-full bg-soraxi-green-hover text-white hover:bg-soraxi-green-hover"
          >
            <Link href="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

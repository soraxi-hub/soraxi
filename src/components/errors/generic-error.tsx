"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "@/trpc/routers/_app";

interface GenericErrorProps {
  error?: Error | TRPCClientErrorLike<AppRouter>;
  onRetry?: () => void;
}

export function GenericError({ error, onRetry }: GenericErrorProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Something Went Wrong</CardTitle>
          <CardDescription className="break-words text-wrap">
            {error?.message || "An unexpected error occurred."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onRetry}
            className="w-full bg-soraxi-green-hover text-white hover:bg-soraxi-green-hover"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

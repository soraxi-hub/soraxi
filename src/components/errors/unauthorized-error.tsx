"use client";

import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface UnauthorizedErrorProps {
  onRetry?: () => void;
}

export function UnauthorizedError({}: // onRetry
UnauthorizedErrorProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You are not authorized to access this page. Please log in and try
            again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            asChild
            className="w-full bg-soraxi-green-hover text-white hover:bg-soraxi-green-hover"
          >
            <Link href="/auth/sign-in">Go to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

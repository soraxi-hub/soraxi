"use client";

import {
  WifiOff,
  // RefreshCw
} from "lucide-react";
// import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface NetworkErrorProps {
  onRetry?: () => void;
  message?: string;
}

export function NetworkError({
  // onRetry,
  message = "Unable to connect to the internet",
}: NetworkErrorProps) {
  // const handleRetry = () => {
  //   if (onRetry) {
  //     onRetry();
  //   } else {
  //     window.location.reload();
  //   }
  // };

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4 pt-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-soraxi-green/15">
            <WifiOff className="h-8 w-8 text-soraxi-green" />
          </div>
          <CardTitle>Network Connection Lost</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-center text-sm text-muted-foreground">
            <p>Please check your internet connection and try again.</p>
            <ul className="space-y-1 text-left">
              <li>
                • Check if your device is connected to Wi-Fi or mobile data
              </li>
              <li>• Try turning airplane mode on and off</li>
              <li>• Restart your router if using Wi-Fi</li>
            </ul>
          </div>
          {/* <Button onClick={handleRetry} className="w-full bg-soraxi-green-hover text-white hover:bg-soraxi-green-hover">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button> */}
        </CardContent>
      </Card>
    </div>
  );
}

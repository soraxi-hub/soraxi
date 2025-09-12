"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

interface NetworkStatusProps {
  showPersistentBanner?: boolean;
  toastDuration?: number;
}

export function NetworkStatus({
  showPersistentBanner = false,
  toastDuration = 5000,
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  // Enhanced connectivity check
  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      const response = await fetch("/api/health-check", {
        method: "HEAD",
        cache: "no-cache",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      // If health check fails, try a simple ping to a reliable service
      try {
        const response = await fetch("https://www.google.com/favicon.ico", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-cache",
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        console.log(response.ok);
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  // Handle online status change
  const handleOnline = useCallback(async () => {
    const actuallyOnline = await checkConnectivity();

    if (actuallyOnline) {
      setIsOnline(true);

      // Show reconnection toast if user was previously offline
      if (wasOffline) {
        toast.success("Connection restored", {
          description: "You're back online!",
          icon: <Wifi className="h-4 w-4" />,
          duration: toastDuration,
        });
        setWasOffline(false);
      }
    }
  }, [checkConnectivity, wasOffline, toastDuration]);

  // Handle offline status change
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);

    toast.error("Connection lost", {
      description: "Please check your internet connection",
      icon: <WifiOff className="h-4 w-4" />,
      duration: Number.POSITIVE_INFINITY, // Keep offline toast until dismissed or back online
      action: {
        label: "Retry",
        onClick: () => {
          checkConnectivity().then((online) => {
            if (online) {
              handleOnline();
            }
          });
        },
      },
    });
  }, [checkConnectivity, handleOnline]);

  // Periodic connectivity check (every 30 seconds when online)
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      const online = await checkConnectivity();
      if (!online && isOnline) {
        handleOffline();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, checkConnectivity, handleOffline]);

  // Set up event listeners
  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Optional persistent banner for offline state
  if (!isOnline && showPersistentBanner) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 text-destructive px-4 py-2">
        <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>
            You're currently offline. Some features may not work properly.
          </span>
        </div>
      </div>
    );
  }

  return null;
}

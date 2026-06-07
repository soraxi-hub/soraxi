"use client";

import { useEffect, useState } from "react";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

export function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const user = await getUserFromCookie();
        setUserId(user?.id ?? null);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  const isAuthenticated = !!userId;

  return {
    userId,
    isAuthenticated,
    isLoading,
  };
}

"use client";

import { useEffect, useState } from "react";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();
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

  const handleLogout = async () => {
    try {
      const response = await axios.post("/api/auth/sign-out");
      if (response.status === 200) {
        router.push("/sign-in");
        router.refresh();
        toast.success("Logged out successfully");
        return;
      }
      toast.error("Logout failed. Please try again.");
    } catch (error) {
      return error;
    }
  };

  const handleStoreLogout = async (storeId: string) => {
    try {
      const response = await axios.post("/api/store/logout");
      if (response.status === 200) {
        router.push(`/store/${storeId}/dashboard`);
        router.refresh();
        toast.success("Logged out successfully");
        return;
      }
      toast.error("Logout failed. Please try again.");
    } catch (error) {
      return error;
    }
  };

  const isAuthenticated = !!userId;

  return {
    userId,
    isAuthenticated,
    isLoading,
    handleLogout,
    handleStoreLogout,
  };
}

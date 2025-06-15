"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Plus,
  Settings,
  BarChart3,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { StoreTokenData } from "@/lib/helpers/get-store-from-cookie";
import { IStore } from "@/lib/db/models/store.model";
import { StoreDashboardSkeleton } from "@/modules/skeletons/store-dashboard-skeleton";

/**
 * Store Dashboard Page
 * Main dashboard for store owners to manage their store
 * Shows store status, quick actions, and navigation to different sections
 */
export default function StoreDashboardPage() {
  const router = useRouter();
  const [storeData, setStoreData] = useState<
    | (IStore & {
        onboarding: {
          profileComplete: boolean;
          businessInfoComplete: boolean;
          shippingComplete: boolean;
          payoutComplete: boolean;
          termsComplete: boolean;

          isComplete: boolean;
          completedSteps: number;
          totalSteps: number;
          percentage: number;
        };
      })
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Check authentication first
  useEffect(() => {
    const fetchStore = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/store/store-data");
        if (!res.ok) throw new Error("Failed to fetch store session data");

        const data = (await res.json()) as StoreTokenData;
        const storeId = data?.id;
        const url = storeId
          ? `/api/store/status?storeId=${storeId}`
          : "/api/store/status";

        const storeRes = await fetch(url);
        const result = await storeRes.json();

        if (storeRes.ok) {
          setStoreData(result.store);
        } else if (storeRes.status === 401) {
          router.push("/sign-in?redirect=/dashboard/store");
        } else {
          setStoreData(null);
        }
      } catch (err) {
        console.error("Error fetching store info:", err);
        setError("Failed to load store information. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStore();
  }, [router]);

  /**
   * Handle store creation navigation
   */
  const handleCreateStore = () => {
    router.push("/dashboard/store/create");
  };

  /**
   * Handle store login navigation
   */
  const handleStoreLogin = () => {
    router.push("/store/login?redirect=/dashboard/store");
  };

  /**
   * Handle continue onboarding
   */
  const handleContinueOnboarding = () => {
    if (!storeData?.onboarding) return;

    // Determine next step
    const { onboarding } = storeData;
    let nextStep = "profile";

    if (!onboarding.profileComplete) nextStep = "profile";
    else if (!onboarding.businessInfoComplete) nextStep = "business-info";
    else if (!onboarding.shippingComplete) nextStep = "shipping";
    else if (!onboarding.payoutComplete) nextStep = "payout";
    else if (!onboarding.termsComplete) nextStep = "terms";

    router.push(
      `/dashboard/store/onboarding/${nextStep}?storeId=${storeData.id}`
    );
  };

  if (isLoading) {
    return <StoreDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No store exists - show create store option
  if (!storeData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-soraxi-green/10 rounded-full flex items-center justify-center mx-auto">
              <Store className="w-8 h-8 text-soraxi-green" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Start Selling Today
            </h1>
            <p className="text-muted-foreground">
              Create your store and start reaching customers on our platform
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Your Store</CardTitle>
              <CardDescription>
                Set up your online store in minutes and start selling to
                thousands of customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleCreateStore}
                className="w-full bg-soraxi-green hover:bg-soraxi-green/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Store
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Already have a store?
                </p>
                <Button
                  variant="outline"
                  onClick={handleStoreLogin}
                  className="w-full"
                >
                  Sign In to Existing Store
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Store exists - show dashboard
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Store Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Welcome back to {storeData.name}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={storeData.status === "active" ? "default" : "secondary"}
              className={storeData.status === "active" ? "bg-soraxi-green" : ""}
            >
              {storeData.status.charAt(0).toUpperCase() +
                storeData.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Store Status Alert */}
        {storeData.status === "pending" && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your store is pending approval.
              {!storeData.onboarding?.isComplete && (
                <span>
                  {" "}
                  Complete your store setup to submit for review.
                  <Button
                    variant="link"
                    onClick={handleContinueOnboarding}
                    className="p-0 h-auto ml-1 text-soraxi-green"
                  >
                    Continue setup →
                  </Button>
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {storeData.status === "active" &&
          storeData.verification?.isVerified && (
            <Alert className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your store is active and verified! You can now start selling
                products.
              </AlertDescription>
            </Alert>
          )}

        {/* Onboarding Progress */}
        {!storeData.onboarding?.isComplete && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Complete Your Store Setup</CardTitle>
              <CardDescription>
                Finish setting up your store to start selling (
                {storeData.onboarding?.percentage || 0}% complete)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-soraxi-green h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${storeData.onboarding?.percentage || 0}%`,
                      }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleContinueOnboarding}
                  className="ml-4 bg-soraxi-green hover:bg-soraxi-green/90 text-white"
                >
                  Continue Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Products */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-soraxi-green" />
                <span>Products</span>
              </CardTitle>
              <CardDescription>Manage your product catalog</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Products
              </Button>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-soraxi-green" />
                <span>Analytics</span>
              </CardTitle>
              <CardDescription>Track your store performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-soraxi-green" />
                <span>Settings</span>
              </CardTitle>
              <CardDescription>Configure your store settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Store Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

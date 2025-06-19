"use client";

export const dynamic = "force-dynamic";

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
  Settings,
  BarChart3,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { IStore } from "@/lib/db/models/store.model";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import AlertUI from "@/modules/shared/alert";
import { StoreDashboardSkeleton } from "@/modules/skeletons/store-dashboard-skeleton";

/**
 * Store Dashboard Page
 * Main dashboard for store owners to manage their store
 * Shows store status, quick actions, and navigation to different sections
 */
export default function StoreDashboardPage({
  store_id,
  error,
}: {
  store_id: string;
  error?: string;
}) {
  const trpc = useTRPC();
  const data = useQuery(trpc.store.getById.queryOptions({ id: store_id }));
  const storeData = data.data as
    | (IStore & {
        onboarding?: {
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
        verification?: {
          isVerified: boolean;
          verificationStatus: string;
        };
      })
    | undefined;
  const router = useRouter();

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

    router.push(`/store/${store_id}/dashboard/onboarding/${nextStep}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <AlertUI message={error} variant={`destructive`} />
      </div>
    );
  }

  // No store exists - show create store option
  if (!storeData) {
    return <StoreDashboardSkeleton />;
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

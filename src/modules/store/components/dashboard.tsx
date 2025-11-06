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
  // BarChart3,
  Package,
  AlertCircle,
  CheckCircle,
  WalletIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import AlertUI from "@/modules/shared/alert";
import { StoreDashboardSkeleton } from "@/modules/skeletons/store-dashboard-skeleton";
import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
import Link from "next/link";
import { StoreStatusEnum } from "@/validators/store-validators";
import { cn } from "@/lib/utils";

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
  const storeData = data.data;
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
    else if (!onboarding.termsComplete) nextStep = "terms";

    router.push(`/store/onboarding/${store_id}/${nextStep}`);
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
    <FeedbackWrapper page={`store-dashboard`} delay={5000}>
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
                className={cn(
                  `text-white`,
                  storeData.status === StoreStatusEnum.Active &&
                    "bg-soraxi-green",
                  storeData.status === StoreStatusEnum.Pending &&
                    "bg-soraxi-warning",
                  storeData.status === StoreStatusEnum.Rejected ||
                    (storeData.status === StoreStatusEnum.Suspended &&
                      "bg-soraxi-error")
                )}
              >
                {storeData.status.charAt(0).toUpperCase() +
                  storeData.status.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Store Status Alert */}
          {storeData.status === StoreStatusEnum.Pending && (
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

          {storeData.status === StoreStatusEnum.Active &&
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
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/store/${store_id}/products`}>
                    View Products
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <WalletIcon className="w-5 h-5 text-soraxi-green" />
                  <span>My Wallet</span>
                </CardTitle>
                <CardDescription>
                  Track your store&#39;s Financials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/store/${store_id}/wallet`}>View Wallet</Link>
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
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/store/${store_id}/profile`}>
                    Store Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </FeedbackWrapper>
  );
}

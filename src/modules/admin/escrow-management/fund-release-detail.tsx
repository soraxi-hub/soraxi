"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Lock,
  RotateCcw,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import {
  IFundRelease,
  FundReleaseStatus,
} from "@/lib/db/models/fund-release.model";
import type { IStore } from "@/lib/db/models/store.model";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ConditionsCard,
  ProductsCard,
  SettlementCard,
  StatusOverviewCard,
  TimelineCard,
} from "../../../components/fund-release";

type AdminActionsType = "approve" | "force-release" | "reverse" | "add-notes";

interface AdminFundReleaseDetailProps {
  fundReleaseId: string;
}

export default function AdminFundReleaseDetail({
  fundReleaseId,
}: AdminFundReleaseDetailProps) {
  const trpc = useTRPC();

  // Fetch fund release details using tRPC
  const {
    data: queryResult,
    isLoading,
    refetch,
  } = useSuspenseQuery(
    trpc.adminFundRelease.getById.queryOptions({
      id: fundReleaseId,
    })
  );

  const adminAction = useMutation(
    trpc.adminFundRelease.adminAction.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Action completed successfully");
        refetch(); // Refetch data after successful action
      },
      onError: (error) => {
        toast.error(`Action failed: ${error.message}`);
      },
    })
  );

  const [showNotesForm, setShowNotesForm] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const handleAdminAction = async (
    action: AdminActionsType,
    notes?: string
  ) => {
    try {
      await adminAction.mutateAsync({
        id: fundReleaseId,
        action,
        adminNotes: notes || adminNotes,
      });

      setShowNotesForm(false);
      setAdminNotes("");
    } catch (error) {
      console.error("Action failed:", error);
    }
  };

  if (isLoading) {
    return <DetailLoadingSkeleton />;
  }

  const fundRelease = queryResult.data.fundRelease;
  const store = queryResult.data.store;
  const subOrder = queryResult.data.relatedSubOrder;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <StatusOverviewCard fundRelease={fundRelease} store={store} />

      {/* Admin Actions Panel */}
      <AdminActionsCard
        fundRelease={fundRelease}
        onAction={handleAdminAction}
        loading={adminAction.isPending}
        showNotesForm={showNotesForm}
        onShowNotesForm={setShowNotesForm}
        adminNotes={adminNotes}
        onAdminNotesChange={setAdminNotes}
      />

      {/* Admin Notes Display */}
      {fundRelease.adminNotes && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">
              Admin Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-800 dark:text-green-200">
              {fundRelease.adminNotes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Settlement Details */}
      <SettlementCard settlement={fundRelease.settlement} />

      {/* Conditions Met */}
      <ConditionsCard fundRelease={fundRelease} />

      {/* Release Timeline */}
      <TimelineCard fundRelease={fundRelease} />

      {/* Order Products */}
      {subOrder && <ProductsCard subOrder={subOrder} />}

      {/* Store Info */}
      {store && <StoreInfoCard store={store} />}

      {/* Risk Indicators if any */}
      {fundRelease.riskIndicators &&
        fundRelease.riskIndicators.flags.length > 0 && (
          <RiskIndicatorsCard riskIndicators={fundRelease.riskIndicators} />
        )}

      {/* Full Audit Metadata */}
      <AuditMetadataCard fundRelease={fundRelease} />
    </div>
  );
}

/**
 * Admin Actions Card - Action buttons for Approve, Force Release, Reverse
 */
function AdminActionsCard({
  fundRelease,
  onAction,
  loading,
  showNotesForm,
  onShowNotesForm,
  adminNotes,
  onAdminNotesChange,
}: {
  fundRelease: IFundRelease;
  onAction: (action: AdminActionsType, notes?: string) => Promise<void>;
  loading: boolean;
  showNotesForm: boolean;
  onShowNotesForm: (show: boolean) => void;
  adminNotes: string;
  onAdminNotesChange: (notes: string) => void;
}) {
  const canApprove = fundRelease.status === FundReleaseStatus.Pending;
  const canForceRelease =
    fundRelease.status === FundReleaseStatus.Pending ||
    fundRelease.status === FundReleaseStatus.Ready;
  const canReverse = fundRelease.status === FundReleaseStatus.Released;

  return (
    <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
      <CardHeader>
        <CardTitle className="text-green-900 dark:text-green-100">
          Admin Actions
        </CardTitle>
        <CardDescription className="text-green-800 dark:text-green-200">
          Manage this fund release
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {canApprove && (
              <Button
                onClick={() => onAction("approve")}
                disabled={loading}
                variant="outline"
                className="border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Release
              </Button>
            )}

            {canForceRelease && (
              <Button
                onClick={() => onAction("force-release")}
                disabled={loading}
                variant="outline"
                className="border-green-300 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Force Release
              </Button>
            )}

            {canReverse && (
              <Button
                onClick={() => onAction("reverse")}
                disabled={loading}
                variant="destructive"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reverse Release
              </Button>
            )}

            <Button
              onClick={() => onShowNotesForm(!showNotesForm)}
              variant="outline"
              disabled={loading}
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {showNotesForm ? "Cancel" : "Add Notes"}
            </Button>
          </div>

          {/* Notes Form */}
          {showNotesForm && (
            <div className="border-t border-green-200 dark:border-green-800 pt-4 space-y-3">
              <textarea
                placeholder="Add admin notes about this release..."
                value={adminNotes}
                onChange={(e) => onAdminNotesChange(e.target.value)}
                className="w-full px-3 py-2 border border-green-200 dark:border-green-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-green-900 dark:text-green-100"
                rows={3}
              />
              <Button
                onClick={() => onAction("add-notes", adminNotes)}
                disabled={loading || !adminNotes.trim()}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 gap-2"
              >
                Save Notes
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Store Info Card - Shows store details for context
 */
function StoreInfoCard({ store }: { store: IStore }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Store Name
            </p>
            <p className="mt-1 font-medium text-foreground">{store.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Verification Status
            </p>
            <p className="mt-1 capitalize text-foreground">
              {store.verification?.isVerified ? "Verified" : "Unverified"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Store Owner Email
            </p>
            <p className="mt-1 text-foreground">{store.storeEmail || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Joined</p>
            <p className="mt-1 text-foreground">
              {store.createdAt
                ? new Date(store.createdAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Risk Indicators Card
 */
function RiskIndicatorsCard({
  riskIndicators,
}: {
  riskIndicators: IFundRelease["riskIndicators"];
}) {
  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="text-orange-900 dark:text-orange-100">
          Risk Indicators
        </CardTitle>
        <CardDescription className="text-orange-800 dark:text-orange-200">
          Flags that may affect this payout
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {riskIndicators?.flags?.map((flag: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-full bg-orange-200 px-3 py-1 text-xs font-medium text-orange-900 dark:bg-orange-800 dark:text-orange-100"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {flag}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Audit Metadata Card - Full record details
 */
function AuditMetadataCard({ fundRelease }: { fundRelease: IFundRelease }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Audit Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Created At
            </p>
            <p className="mt-1 text-xs text-foreground font-mono">
              {new Date(fundRelease.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Last Updated
            </p>
            <p className="mt-1 text-xs text-foreground font-mono">
              {new Date(fundRelease.updatedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Fund Release ID
            </p>
            <p className="mt-1 text-xs text-foreground font-mono">
              {fundRelease._id.toString()}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Store ID
            </p>
            <p className="mt-1 text-xs text-foreground font-mono">
              {String(fundRelease.storeId).slice(0, 12)}...
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Detail loading skeleton
 */
function DetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}

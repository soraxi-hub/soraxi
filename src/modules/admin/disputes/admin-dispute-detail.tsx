"use client";

import { Suspense, useState } from "react";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ImageIcon,
  LockKeyhole,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatNaira } from "@/lib/utils/naira";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { DisputeStatus, DisputeOutcome } from "@/enums/financial.enums";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";

// ---------------------------------------------------------------------------
// Resolution action types
// ---------------------------------------------------------------------------

type ResolutionAction = "upheld" | "rejected" | "inconclusive";

const actionConfig: Record<
  ResolutionAction,
  {
    label: string;
    description: string;
    confirmLabel: string;
    icon: React.ElementType;
    buttonClass: string;
    dialogClass: string;
  }
> = {
  upheld: {
    label: "Uphold Dispute",
    description:
      "Rule in favour of the student. They will be refunded and the vendor will be penalised.",
    confirmLabel: "Yes, Uphold & Refund Student",
    icon: CheckCircle2,
    buttonClass: "bg-soraxi-green hover:bg-soraxi-green/90 text-white",
    dialogClass: "border-soraxi-green/30",
  },
  rejected: {
    label: "Reject Dispute",
    description:
      "Rule in favour of the vendor. Their frozen funds will be released back to their wallet.",
    confirmLabel: "Yes, Reject & Release Funds",
    icon: ShieldCheck,
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    dialogClass: "border-blue-300/30",
  },
  inconclusive: {
    label: "Request More Evidence",
    description:
      "Mark as inconclusive and request additional evidence from the student. They will have 48 hours to respond.",
    confirmLabel: "Yes, Request Evidence",
    icon: AlertTriangle,
    buttonClass:
      "variant-outline border-amber-400 text-amber-700 dark:text-amber-300",
    dialogClass: "border-amber-300/30",
  },
};

// ---------------------------------------------------------------------------
// Inner content component
// ---------------------------------------------------------------------------

function AdminDisputeDetailContent({ disputeId }: { disputeId: string }) {
  const trpc = useTRPC();

  const { data: dispute, refetch } = useSuspenseQuery(
    trpc.adminDispute.getAdminDisputeById.queryOptions({ disputeId }),
  );

  const [pendingAction, setPendingAction] = useState<ResolutionAction | null>(
    null,
  );
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const isResolvable =
    dispute.status === DisputeStatus.OPEN ||
    dispute.status === DisputeStatus.AWAITING_EVIDENCE;

  // Resolution mutations
  const upheldMutation = useMutation(
    trpc.adminDispute.resolveDisputeUpheld.mutationOptions({
      onSuccess: () => {
        toast.success("Dispute upheld. Student will be refunded.");
        setConfirmDialogOpen(false);
        setPendingAction(null);
        setResolutionNotes("");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to resolve dispute.");
      },
    }),
  );

  const rejectedMutation = useMutation(
    trpc.adminDispute.resolveDisputeRejected.mutationOptions({
      onSuccess: () => {
        toast.success("Dispute rejected. Vendor funds released.");
        setConfirmDialogOpen(false);
        setPendingAction(null);
        setResolutionNotes("");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to resolve dispute.");
      },
    }),
  );

  const inconclusiveMutation = useMutation(
    trpc.adminDispute.markDisputeInconclusive.mutationOptions({
      onSuccess: () => {
        toast.success("Additional evidence requested from student.");
        setConfirmDialogOpen(false);
        setPendingAction(null);
        setResolutionNotes("");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to update dispute.");
      },
    }),
  );

  const isSubmitting =
    upheldMutation.isPending ||
    rejectedMutation.isPending ||
    inconclusiveMutation.isPending;

  const handleActionClick = (action: ResolutionAction) => {
    setPendingAction(action);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!pendingAction) return;

    const input = {
      disputeId,
      resolutionNotes: resolutionNotes.trim() || undefined,
    };

    if (pendingAction === "upheld") {
      upheldMutation.mutate(input);
    } else if (pendingAction === "rejected") {
      rejectedMutation.mutate(input);
    } else {
      inconclusiveMutation.mutate({ disputeId });
    }
  };

  const pendingConfig = pendingAction ? actionConfig[pendingAction] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/admin/disputes">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Disputes
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Dispute #{disputeId.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground">
              Opened{" "}
              {format(new Date(dispute.openedAt), "MMMM dd, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status badge */}
          {dispute.status === DisputeStatus.OPEN && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              Open
            </Badge>
          )}
          {dispute.status === DisputeStatus.AWAITING_EVIDENCE && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              Awaiting Evidence
            </Badge>
          )}
          {dispute.status === DisputeStatus.RESOLVED && (
            <Badge className="bg-green-100 text-green-800">Resolved</Badge>
          )}
          {dispute.status === DisputeStatus.AUTO_RESOLVED && (
            <Badge className="bg-gray-100 text-gray-800">Auto-Resolved</Badge>
          )}

          {/* Urgency indicator */}
          {dispute.businessDaysRemaining !== null && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                dispute.businessDaysRemaining === 0
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  : dispute.businessDaysRemaining <= 1
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              }`}
            >
              <Clock className="h-3 w-3" />
              {dispute.businessDaysRemaining === 0
                ? "Due today"
                : `${dispute.businessDaysRemaining} day${dispute.businessDaysRemaining !== 1 ? "s" : ""} left`}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — case details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Financial summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <LockKeyhole className="h-4 w-4" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-xs text-muted-foreground">Frozen</p>
                  <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    {formatNaira(dispute.frozenAmountNaira)}
                  </p>
                </div>
                {dispute.financialBreakdown && (
                  <>
                    <div className="text-center p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">Gross</p>
                      <p className="text-sm font-semibold">
                        {formatNaira(dispute.financialBreakdown.grossAmount)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">
                        Commission
                      </p>
                      <p className="text-sm font-semibold text-soraxi-green">
                        {formatNaira(dispute.financialBreakdown.commission)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/40">
                      <p className="text-xs text-muted-foreground">
                        Vendor Net
                      </p>
                      <p className="text-sm font-semibold">
                        {formatNaira(dispute.financialBreakdown.settleAmount)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products in dispute */}
          {dispute.products.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Items in Dispute
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dispute.products.map((product, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg border border-border"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {product.quantity} × {formatNaira(product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Customer complaint */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Customer's Complaint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {dispute.reason}
              </p>
            </CardContent>
          </Card>

          {/* Evidence */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Evidence ({dispute.evidence.length} photo
                {dispute.evidence.length !== 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dispute.evidence.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {dispute.evidence.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
                    >
                      <Image
                        src={url}
                        alt={`Evidence ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">No evidence submitted</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional evidence */}
          {dispute.additionalEvidence.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Additional Evidence ({dispute.additionalEvidence.length} photo
                  {dispute.additionalEvidence.length !== 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {dispute.additionalEvidence.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
                    >
                      <Image
                        src={url}
                        alt={`Additional evidence ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — resolution panel */}
        <div className="space-y-4">
          {/* Case metadata */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Case Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <Link
                  href={`/admin/orders/${dispute.orderId}`}
                  className="text-primary underline font-mono text-xs"
                >
                  {dispute.orderId.slice(-8).toUpperCase()}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opened</span>
                <span>
                  {format(new Date(dispute.openedAt), "MMM dd, yyyy")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline</span>
                <span
                  className={
                    dispute.businessDaysRemaining !== null &&
                    dispute.businessDaysRemaining <= 1
                      ? "text-destructive font-semibold"
                      : ""
                  }
                >
                  {format(new Date(dispute.deadline), "MMM dd, yyyy")}
                </span>
              </div>
              {dispute.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>
                    {format(new Date(dispute.resolvedAt), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
              {dispute.resolvedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved by</span>
                  <Badge variant="outline" className="text-xs">
                    {dispute.resolvedBy}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution notes */}
          {isResolvable && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Resolution Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Optional — add context for the resolution decision..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="min-h-[80px] resize-none text-sm"
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          )}

          {/* Resolution actions */}
          {isResolvable ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full bg-soraxi-green hover:bg-soraxi-green/90 text-white"
                  onClick={() => handleActionClick("upheld")}
                  disabled={isSubmitting}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Uphold — Refund Student
                </Button>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleActionClick("rejected")}
                  disabled={isSubmitting}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Reject — Release to Vendor
                </Button>
                {dispute.status === DisputeStatus.OPEN && (
                  <Button
                    variant="outline"
                    className="w-full border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    onClick={() => handleActionClick("inconclusive")}
                    disabled={isSubmitting}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Request More Evidence
                  </Button>
                )}
                <p className="text-xs text-muted-foreground text-center pt-1">
                  These actions are irreversible. Review all evidence before
                  deciding.
                </p>
              </CardContent>
            </Card>
          ) : (
            // Resolution outcome — shown when dispute is resolved
            dispute.outcome && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Resolution Outcome
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dispute.outcome === DisputeOutcome.UPHELD && (
                    <div className="flex items-center gap-2 text-soraxi-green">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        Upheld — Student refunded
                      </span>
                    </div>
                  )}
                  {dispute.outcome === DisputeOutcome.REJECTED && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        Rejected — Vendor funds released
                      </span>
                    </div>
                  )}
                  {dispute.resolutionNotes && (
                    <p className="text-sm text-muted-foreground border-t border-border pt-2 mt-2">
                      {dispute.resolutionNotes}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          if (!isSubmitting) setConfirmDialogOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingConfig && <pendingConfig.icon className="h-5 w-5" />}
              {pendingConfig?.label}
            </DialogTitle>
            <DialogDescription>{pendingConfig?.description}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dispute</span>
              <span className="font-mono">
                #{disputeId.slice(-8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frozen amount</span>
              <span className="font-semibold">
                {formatNaira(dispute.frozenAmountNaira)}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            This action is <strong>irreversible</strong>. Are you sure?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className={
                pendingAction === "upheld"
                  ? "bg-soraxi-green hover:bg-soraxi-green/90 text-white"
                  : pendingAction === "rejected"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "border-amber-400 text-amber-700"
              }
            >
              {isSubmitting ? "Processing..." : pendingConfig?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminDisputeDetail({ disputeId }: { disputeId: string }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense
        fallback={
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <AdminDisputeDetailContent disputeId={disputeId} />
      </Suspense>
    </ErrorBoundary>
  );
}

export default withAdminAuth(AdminDisputeDetail, {
  requiredPermissions: [PERMISSIONS.RESOLVE_DISPUTES],
});

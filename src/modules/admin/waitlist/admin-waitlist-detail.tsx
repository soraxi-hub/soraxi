"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  ExternalLink,
  ImageIcon,
  Instagram,
  Loader2,
  Package,
  ShieldCheck,
  Store,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";
import { toast } from "sonner";
import Image from "next/image";

interface AdminWaitlistDetailProps {
  applicationId: string;
}

type ActionType = "approve" | "reject";

const STATUS_BANNER: Record<
  string,
  {
    icon: React.ReactNode;
    title: string;
    message: string;
    borderColor: string;
  }
> = {
  pending: {
    icon: <Clock className="w-5 h-5 text-amber-600" />,
    title: "Awaiting Review",
    message:
      "This application has not yet been reviewed. Use the actions below to approve or reject.",
    borderColor: "border-l-amber-400",
  },
  approved: {
    icon: <CheckCircle className="w-5 h-5 text-blue-600" />,
    title: "Application Approved",
    message:
      "This vendor has been approved. An invite email has been sent to their address.",
    borderColor: "border-l-blue-400",
  },
  invited: {
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    title: "Vendor Onboarded",
    message:
      "The vendor has redeemed their invite and is setting up their store.",
    borderColor: "border-l-green-400",
  },
  rejected: {
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    title: "Application Rejected",
    message: "This application was rejected. The vendor has been notified.",
    borderColor: "border-l-red-400",
  },
};

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "approved":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          Approved
        </Badge>
      );
    case "invited":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
          Invited
        </Badge>
      );
    case "rejected":
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getCategorySaturationLabel(count: number) {
  if (count >= 20) return { label: "High competition", color: "text-red-600" };
  if (count >= 10)
    return { label: "Moderate competition", color: "text-amber-600" };
  return { label: "Low competition", color: "text-green-600" };
}

/**
 * Admin Waitlist Application Detail
 *
 * Full read view of a vendor application plus approve/reject actions.
 * Approve triggers invite email; reject requires a written reason.
 */
function AdminWaitlistDetail({ applicationId }: AdminWaitlistDetailProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>("approve");
  const [rejectionReason, setRejectionReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, refetch, isLoading, error } = useQuery(
    trpc.waitlist.getApplicationById.queryOptions({ applicationId }),
  );

  const application = data?.application;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const approveMutation = useMutation(
    trpc.waitlist.approveApplication.mutationOptions({
      onSuccess: () => {
        toast.success("Application approved. Invite email sent.");
        queryClient.invalidateQueries(
          trpc.waitlist.getApplicationById.queryOptions({ applicationId }),
        );
        queryClient.invalidateQueries(
          trpc.waitlist.getPendingApplications.queryOptions({
            page: 1,
            limit: 20,
          }),
        );
        setDialogOpen(false);
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to approve application");
      },
    }),
  );

  const rejectMutation = useMutation(
    trpc.waitlist.rejectApplication.mutationOptions({
      onSuccess: () => {
        toast.success("Application rejected. Vendor has been notified.");
        queryClient.invalidateQueries(
          trpc.waitlist.getApplicationById.queryOptions({ applicationId }),
        );
        queryClient.invalidateQueries(
          trpc.waitlist.getPendingApplications.queryOptions({
            page: 1,
            limit: 20,
          }),
        );
        setDialogOpen(false);
        setRejectionReason("");
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to reject application");
      },
    }),
  );

  const isActioning = approveMutation.isPending || rejectMutation.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openApproveDialog = () => {
    setActionType("approve");
    setRejectionReason("");
    setReasonError("");
    setDialogOpen(true);
  };

  const openRejectDialog = () => {
    setActionType("reject");
    setRejectionReason("");
    setReasonError("");
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (actionType === "reject") {
      if (!rejectionReason.trim() || rejectionReason.trim().length < 10) {
        setReasonError(
          "Please provide a meaningful rejection reason (at least 10 characters).",
        );
        return;
      }
    }

    if (actionType === "approve") {
      approveMutation.mutate({ applicationId });
    } else {
      rejectMutation.mutate({ applicationId, reason: rejectionReason.trim() });
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 py-6 px-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !application) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">
            Error Loading Application
          </h3>
          <p className="text-muted-foreground mb-4">
            {error?.message ?? "Application not found"}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const banner = STATUS_BANNER[application.status] ?? STATUS_BANNER.pending;
  const saturation = getCategorySaturationLabel(
    application.categoryVendorCount,
  );
  const isPending = application.status === "pending";

  return (
    <>
      <div className="space-y-6 py-0 px-0">
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">
              Application Review
            </h1>
            <p className="text-muted-foreground text-sm truncate">
              Ref: {application.referenceId} ·{" "}
              {format(new Date(application.createdAt), "PPP")}
            </p>
          </div>

          {isPending && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 w-full sm:w-auto"
                onClick={openRejectDialog}
                disabled={isActioning}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button
                className="bg-soraxi-green hover:bg-soraxi-green-hover text-white w-full sm:w-auto"
                onClick={openApproveDialog}
                disabled={isActioning}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Send Invite
              </Button>
            </div>
          )}
        </div>

        {/* ── Status banner ─────────────────────────────────────────────────── */}
        <div className={`rounded-xl border p-4`}>
          <div className="flex items-start gap-3">
            {banner.icon}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{banner.title}</span>
                {getStatusBadge(application.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {banner.message}
              </p>
              {application.status === "rejected" &&
                application.rejectionReason && (
                  <p className="text-sm text-red-600 mt-2">
                    <span className="font-medium">Reason: </span>
                    {application.rejectionReason}
                  </p>
                )}
            </div>
          </div>
        </div>

        {/* ── Main content grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business & Contact */}
            <div className="rounded-xl border p-5 space-y-5">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Building2 className="w-4 h-4 text-soraxi-green" />
                <span className="font-semibold">Business & Contact</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Business Name
                  </Label>
                  <p className="font-medium mt-0.5">
                    {application.businessName}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Owner Name
                  </Label>
                  <p className="font-medium mt-0.5">{application.ownerName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="mt-0.5">{application.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone</Label>
                  <p className="mt-0.5">{application.phone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Institution
                  </Label>
                  <p className="font-medium mt-0.5">
                    {application.institution || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">State</Label>
                  <p className="font-medium mt-0.5">
                    {application.stateOfApplicant || "—"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">City</Label>
                  <p className="font-medium mt-0.5">
                    {application.cityOfApplicant || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Category & Inventory */}
            <div className="rounded-xl border p-5 space-y-5">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Tag className="w-4 h-4 text-soraxi-green" />
                <span className="font-semibold">Category & Inventory</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Category
                  </Label>
                  <p className="font-medium mt-0.5">{application.categoryId}</p>
                </div>
                {application.subCategory && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Subcategory
                    </Label>
                    <p className="mt-0.5">{application.subCategory}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Inventory Size
                  </Label>
                  <p className="mt-0.5 capitalize">
                    {application.estimatedInventorySize}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Price Range
                  </Label>
                  <p className="mt-0.5">
                    ₦{application.estimatedPriceRange.min.toLocaleString()} – ₦
                    {application.estimatedPriceRange.max.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Business Model
                  </Label>
                  <Badge variant="outline" className="mt-1">
                    {application.isDropshipper ? "Dropshipper" : "Holds stock"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Product Samples */}
            {application.productSamples.length > 0 && (
              <div className="rounded-xl border p-5 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b">
                  <ImageIcon className="w-4 h-4 text-soraxi-green" />
                  <span className="font-semibold">
                    Product Samples ({application.productSamples.length})
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {application.productSamples.map((sample, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border"
                    >
                      <Image
                        src={sample}
                        alt={`Sample ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar (1/3) */}
          <div className="space-y-6">
            {/* Category saturation — key decision signal */}
            <div className="rounded-xl border p-5 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Users className="w-4 h-4 text-soraxi-green" />
                <span className="font-semibold">Category Saturation</span>
              </div>
              <div className="text-center py-3">
                <p className={`text-5xl font-bold ${saturation.color}`}>
                  {application.categoryVendorCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  active vendors in this category
                </p>
                <p className={`text-xs font-medium mt-2 ${saturation.color}`}>
                  {saturation.label}
                </p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>
                  <span className="text-green-600 font-medium">Green</span> —
                  under 10 vendors
                </p>
                <p>
                  <span className="text-amber-600 font-medium">Amber</span> —
                  10–19 vendors
                </p>
                <p>
                  <span className="text-red-600 font-medium">Red</span> — 20+
                  vendors
                </p>
              </div>
            </div>

            {/* Business proof */}
            <div className="rounded-xl border p-5 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b">
                <ShieldCheck className="w-4 h-4 text-soraxi-green" />
                <span className="font-semibold">Business Proof</span>
              </div>

              {application.cacNumber ? (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    CAC Number
                  </Label>
                  <p className="font-mono mt-0.5">{application.cacNumber}</p>
                </div>
              ) : null}

              {application.instagramHandle ? (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Instagram
                  </Label>
                  <a
                    href={`https://instagram.com/${application.instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-0.5"
                  >
                    <Instagram className="w-3.5 h-3.5" />@
                    {application.instagramHandle}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : null}

              {application.otherProofUrl ? (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Other Link
                  </Label>
                  <a
                    href={application.otherProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline mt-0.5 break-all"
                  >
                    {application.otherProofUrl}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              ) : null}

              {!application.cacNumber &&
                !application.instagramHandle &&
                !application.otherProofUrl && (
                  <p className="text-sm text-muted-foreground">
                    No proof provided
                  </p>
                )}
            </div>

            {/* Store/review metadata */}
            <div className="rounded-xl border p-5 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Store className="w-4 h-4 text-soraxi-green" />
                <span className="font-semibold">Application Metadata</span>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Reference ID
                </Label>
                <p className="font-mono text-sm mt-0.5">
                  {application.referenceId}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Applied</Label>
                <p className="text-sm mt-0.5">
                  {format(new Date(application.createdAt), "PPP 'at' p")}
                </p>
              </div>
              {application.reviewedBy && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Reviewed by
                  </Label>
                  <p className="text-sm mt-0.5">{application.reviewedBy}</p>
                </div>
              )}
            </div>

            {/* Package / inventory summary */}
            <div className="rounded-xl border p-5 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b">
                <Package className="w-4 h-4 text-soraxi-green" />
                <span className="font-semibold">Inventory Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Size</Label>
                  <p className="capitalize mt-0.5 font-medium">
                    {application.estimatedInventorySize}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Min Price
                  </Label>
                  <p className="mt-0.5 font-medium">
                    ₦{application.estimatedPriceRange.min.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Max Price
                  </Label>
                  <p className="mt-0.5 font-medium">
                    ₦{application.estimatedPriceRange.max.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="mt-0.5">
                    {application.isDropshipper ? "Drop" : "Stock"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Approve / Reject dialog ───────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Approve Application
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Reject Application
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `You are about to approve ${application.businessName}. An invite email will be sent to ${application.email} with a one-time onboarding link valid for 14 days.`
                : `You are about to reject ${application.businessName}. They will receive an email with your reason. This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="space-y-2 py-2">
              <Label htmlFor="rejectionReason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                rows={4}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (reasonError) setReasonError("");
                }}
                placeholder="e.g. Your category is currently overloaded and we cannot onboard new vendors at this time. Please reapply in 3 months."
                className="resize-none"
                disabled={isActioning}
              />
              {reasonError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {reasonError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                This reason will be included in the rejection email sent to the
                vendor.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isActioning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isActioning}
              className={
                actionType === "approve"
                  ? "bg-soraxi-green hover:bg-soraxi-green-hover text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isActioning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {actionType === "approve" ? "Approving…" : "Rejecting…"}
                </>
              ) : actionType === "approve" ? (
                "Confirm Approval"
              ) : (
                "Confirm Rejection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default withAdminAuth(AdminWaitlistDetail, {
  requiredPermissions: [PERMISSIONS.MANAGE_WAITLIST],
});

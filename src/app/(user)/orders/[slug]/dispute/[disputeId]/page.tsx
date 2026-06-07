"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import {
  DisputePageHeader,
  DisputeStatusCard,
  DisputeOutcomeCard,
  FinancialSummaryCard,
  ComplaintCard,
  EvidenceSection,
  DisputeTimeline,
  WhatHappensNextSection,
  SupportSection,
} from "@/components/disputes";
import { statusConfig as statusConfigMap } from "@/config/dispute-config";
import { DisputeOutcome } from "@/enums/financial.enums";

// http://localhost:3000/orders/6a1de4e8f957fa34e9f0b5fe/dispute/6a1dfa8e72c3600e2235c18d

/**
 * Inner page component — data fetched via Suspense
 */
function DisputeStatusContent({
  orderId,
  disputeId,
}: {
  orderId: string;
  disputeId: string;
}) {
  const trpc = useTRPC();

  const { data: dispute } = useSuspenseQuery(
    trpc.customerDispute.getDisputeById.queryOptions({ disputeId }),
  );

  const config = statusConfigMap[dispute.status];
  const actionRequired = config.actionRequired;

  return (
    <main className="max-w-5xl mx-auto px-4 pb-10 space-y-4">
      {/* Page header */}
      <div className="pt-4">
        <DisputePageHeader orderId={orderId} disputeId={disputeId} />
      </div>

      {/* Status card */}
      <DisputeStatusCard
        status={dispute.status}
        deadline={dispute.deadline}
        additionalEvidenceDeadline={dispute.additionalEvidenceDeadline}
        orderId={orderId}
        disputeId={disputeId}
      />

      {/* Outcome card — shown after resolution */}
      {dispute.outcome && (
        <DisputeOutcomeCard
          outcome={dispute.outcome}
          resolvedAt={dispute.resolvedAt}
          resolvedBy={dispute.resolvedBy}
          frozenAmount={dispute.frozenAmount}
        />
      )}

      {/* Timeline section */}
      <DisputeTimeline
        status={dispute.status}
        openedAt={dispute.openedAt}
        resolvedAt={dispute.resolvedAt}
      />

      {/* What happens next section */}
      <WhatHappensNextSection
        status={dispute.status}
        actionRequired={actionRequired}
      />

      {/* Financial summary */}
      <FinancialSummaryCard
        frozenAmount={dispute.frozenAmount}
        openedAt={dispute.openedAt}
        refundAmount={
          dispute.outcome === DisputeOutcome.UPHELD
            ? dispute.frozenAmount
            : undefined
        }
      />

      {/* Complaint */}
      <ComplaintCard reason={dispute.reason} />

      {/* Evidence submitted */}
      {dispute.evidence && dispute.evidence.length > 0 && (
        <EvidenceSection
          title="Evidence Submitted"
          evidence={dispute.evidence}
        />
      )}

      {/* Additional evidence — shown if submitted */}
      {dispute.additionalEvidence && dispute.additionalEvidence.length > 0 && (
        <EvidenceSection
          title="Additional Evidence"
          evidence={dispute.additionalEvidence}
        />
      )}

      <Separator />

      {/* Support section */}
      <SupportSection />
    </main>
  );
}

/**
 * Page export with Suspense + ErrorBoundary
 */
export default async function DisputeStatusPage({
  params,
}: {
  params: Promise<{ orderId: string; disputeId: string }>;
}) {
  const { orderId, disputeId } = await params;
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto px-4 pt-10 space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        }
      >
        <DisputeStatusContent orderId={orderId} disputeId={disputeId} />
      </Suspense>
    </ErrorBoundary>
  );
}

// "use client";

// import { Suspense } from "react";
// import { useSuspenseQuery } from "@tanstack/react-query";
// import { useTRPC } from "@/trpc/client";
// import {
//   AlertTriangle,
//   ArrowLeft,
//   CheckCircle2,
//   Clock,
//   ImageIcon,
//   XCircle,
//   RefreshCw,
//   Upload,
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import { formatNaira } from "@/lib/utils/naira";
// import {
//   DisputeStatus,
//   DisputeOutcome,
//   DisputeResolvedBy,
// } from "@/enums/financial.enums";
// import Link from "next/link";
// import { ErrorBoundary } from "react-error-boundary";
// import { ErrorFallback } from "@/components/errors/error-fallback";
// import { DateFormatter } from "@/lib/utils/date-formatter";

// // ---------------------------------------------------------------------------
// // Status config — maps dispute status to visual treatment
// // ---------------------------------------------------------------------------

// const statusConfig = {
//   [DisputeStatus.OPEN]: {
//     label: "Under Review",
//     color:
//       "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
//     icon: Clock,
//     description:
//       "Our team is reviewing your dispute. We aim to resolve it within 5 business days.",
//   },
//   [DisputeStatus.AWAITING_EVIDENCE]: {
//     label: "More Evidence Needed",
//     color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
//     icon: Upload,
//     description:
//       "Our team needs additional evidence to make a decision. Please submit more photos within 48 hours.",
//   },
//   [DisputeStatus.RESOLVED]: {
//     label: "Resolved",
//     color:
//       "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
//     icon: CheckCircle2,
//     description: "This dispute has been resolved.",
//   },
//   [DisputeStatus.AUTO_RESOLVED]: {
//     label: "Auto-Resolved",
//     color:
//       "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
//     icon: RefreshCw,
//     description:
//       "This dispute was automatically resolved because our team did not respond in time.",
//   },
// };

// const outcomeConfig = {
//   [DisputeOutcome.UPHELD]: {
//     label: "Resolved in your favour",
//     color: "text-soraxi-green",
//     icon: CheckCircle2,
//     description: "Your dispute was upheld. A refund has been issued.",
//   },
//   [DisputeOutcome.REJECTED]: {
//     label: "Resolved in vendor's favour",
//     color: "text-destructive",
//     icon: XCircle,
//     description:
//       "After reviewing the evidence, we could not uphold this dispute.",
//   },
//   [DisputeOutcome.INCONCLUSIVE]: {
//     label: "Inconclusive — evidence requested",
//     color: "text-blue-600 dark:text-blue-400",
//     icon: AlertTriangle,
//     description: "Additional evidence has been requested.",
//   },
// };

// // ---------------------------------------------------------------------------
// // Inner page component — data fetched via Suspense
// // ---------------------------------------------------------------------------

// function DisputeStatusContent({
//   orderId,
//   disputeId,
// }: {
//   orderId: string;
//   disputeId: string;
// }) {
//   const trpc = useTRPC();

//   const { data: dispute } = useSuspenseQuery(
//     trpc.customerDispute.getDisputeById.queryOptions({ disputeId }),
//   );

//   const status = statusConfig[dispute.status];
//   const StatusIcon = status.icon;

//   const outcome = dispute.outcome ? outcomeConfig[dispute.outcome] : null;
//   const OutcomeIcon = outcome?.icon;

//   const daysRemaining =
//     dispute.status === DisputeStatus.OPEN && dispute.deadline
//       ? DateFormatter.businessDaysUntil(new Date(dispute.deadline), [0, 6])
//       : null;

//   const evidenceDeadlineRemaining =
//     dispute.status === DisputeStatus.AWAITING_EVIDENCE &&
//     dispute.additionalEvidenceDeadline
//       ? Math.max(
//           0,
//           Math.ceil(
//             (new Date(dispute.additionalEvidenceDeadline).getTime() -
//               Date.now()) /
//               (1000 * 60 * 60),
//           ),
//         )
//       : null;

//   return (
//     <main className="max-w-lg mx-auto px-4 pb-10 space-y-4">
//       {/* Back navigation */}
//       <div className="pt-4">
//         <Link href={`/orders/${orderId}`}>
//           <Button variant="ghost" size="sm" className="gap-2 pl-0">
//             <ArrowLeft className="h-4 w-4" />
//             Back to Order
//           </Button>
//         </Link>
//       </div>

//       {/* Page title */}
//       <div className="flex items-center gap-3">
//         <div className="p-2.5 rounded-full bg-destructive/10">
//           <AlertTriangle className="h-5 w-5 text-destructive" />
//         </div>
//         <div>
//           <h1 className="text-lg font-semibold text-foreground">
//             Dispute Details
//           </h1>
//           <p className="text-xs text-muted-foreground font-mono">
//             #{disputeId.slice(-8).toUpperCase()}
//           </p>
//         </div>
//       </div>

//       {/* Status card */}
//       <Card className="border-0 shadow-sm">
//         <CardContent className="pt-4 pb-4">
//           <div className="flex items-start gap-3">
//             <div className={`p-2 rounded-full ${status.color}`}>
//               <StatusIcon className="h-4 w-4" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center gap-2 flex-wrap">
//                 <span className="font-semibold text-foreground">
//                   {status.label}
//                 </span>
//                 <Badge
//                   variant="outline"
//                   className={`text-xs ${status.color} border-current`}
//                 >
//                   {dispute.status}
//                 </Badge>
//               </div>
//               <p className="text-sm text-muted-foreground mt-1">
//                 {status.description}
//               </p>

//               {/* Deadline countdown for OPEN disputes */}
//               {daysRemaining !== null && (
//                 <div className="mt-2 flex items-center gap-1.5">
//                   <Clock className="h-3.5 w-3.5 text-amber-500" />
//                   <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
//                     {daysRemaining === 0
//                       ? "Resolution due today"
//                       : `${daysRemaining} business day${daysRemaining !== 1 ? "s" : ""} remaining`}
//                   </span>
//                 </div>
//               )}

//               {/* Evidence submission deadline */}
//               {evidenceDeadlineRemaining !== null && (
//                 <div className="mt-2 flex items-center gap-1.5">
//                   <Clock className="h-3.5 w-3.5 text-blue-500" />
//                   <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
//                     {evidenceDeadlineRemaining === 0
//                       ? "Submission window closing soon"
//                       : `${evidenceDeadlineRemaining}h remaining to submit evidence`}
//                   </span>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Additional evidence submission button */}
//           {dispute.status === DisputeStatus.AWAITING_EVIDENCE && (
//             <Link
//               href={`/orders/${orderId}/dispute/${disputeId}/submit-evidence`}
//             >
//               <Button className="w-full mt-4 bg-soraxi-green hover:bg-soraxi-green-hover text-white">
//                 <Upload className="h-4 w-4 mr-2" />
//                 Submit Additional Evidence
//               </Button>
//             </Link>
//           )}
//         </CardContent>
//       </Card>

//       {/* Outcome card — shown after resolution */}
//       {outcome && OutcomeIcon && (
//         <Card className="border-0 shadow-sm">
//           <CardHeader className="pb-2 pt-4">
//             <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
//               Outcome
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="pb-4">
//             <div className="flex items-start gap-3">
//               <OutcomeIcon className={`h-5 w-5 mt-0.5 ${outcome.color}`} />
//               <div>
//                 <p className={`font-semibold ${outcome.color}`}>
//                   {outcome.label}
//                 </p>
//                 <p className="text-sm text-muted-foreground mt-0.5">
//                   {outcome.description}
//                 </p>
//                 {dispute.resolvedAt && (
//                   <p className="text-xs text-muted-foreground mt-1">
//                     Resolved on{" "}
//                     {new Date(dispute.resolvedAt).toLocaleDateString("en-NG", {
//                       day: "numeric",
//                       month: "long",
//                       year: "numeric",
//                     })}
//                     {dispute.resolvedBy === DisputeResolvedBy.SYSTEM &&
//                       " · Auto-resolved"}
//                   </p>
//                 )}
//               </div>
//             </div>

//             {/* Refund amount if upheld */}
//             {dispute.outcome === DisputeOutcome.UPHELD &&
//               dispute.frozenAmount > 0 && (
//                 <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
//                   <p className="text-sm text-green-800 dark:text-green-300">
//                     Refund amount:{" "}
//                     <span className="font-semibold">
//                       {formatNaira(dispute.frozenAmount)}
//                     </span>
//                   </p>
//                 </div>
//               )}
//           </CardContent>
//         </Card>
//       )}

//       {/* Financial summary */}
//       <Card className="border-0 shadow-sm">
//         <CardHeader className="pb-2 pt-4">
//           <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
//             Financial Summary
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="pb-4 space-y-2">
//           <div className="flex justify-between items-center py-1.5 border-b border-border/50">
//             <span className="text-sm text-muted-foreground">
//               Amount in dispute
//             </span>
//             <span className="text-sm font-semibold">
//               {formatNaira(dispute.frozenAmount)}
//             </span>
//           </div>
//           <div className="flex justify-between items-center py-1.5">
//             <span className="text-sm text-muted-foreground">Opened on</span>
//             <span className="text-sm font-medium">
//               {new Date(dispute.openedAt).toLocaleDateString("en-NG", {
//                 day: "numeric",
//                 month: "short",
//                 year: "numeric",
//               })}
//             </span>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Submitted reason */}
//       <Card className="border-0 shadow-sm">
//         <CardHeader className="pb-2 pt-4">
//           <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
//             Your Complaint
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="pb-4">
//           <p className="text-sm text-foreground leading-relaxed">
//             {dispute.reason}
//           </p>
//         </CardContent>
//       </Card>

//       {/* Evidence submitted */}
//       <Card className="border-0 shadow-sm">
//         <CardHeader className="pb-2 pt-4">
//           <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
//             Evidence Submitted
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="pb-4">
//           {dispute.evidence.length > 0 ? (
//             <div className="grid grid-cols-3 gap-2">
//               {dispute.evidence.map((url, index) => (
//                 <a
//                   key={index}
//                   href={url}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
//                 >
//                   {/* eslint-disable-next-line @next/next/no-img-element */}
//                   <img
//                     src={url}
//                     alt={`Evidence ${index + 1}`}
//                     className="w-full h-full object-cover"
//                   />
//                 </a>
//               ))}
//             </div>
//           ) : (
//             <div className="flex items-center gap-2 text-muted-foreground">
//               <ImageIcon className="h-4 w-4" />
//               <span className="text-sm">No evidence submitted</span>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Additional evidence — shown if submitted */}
//       {dispute.additionalEvidence && dispute.additionalEvidence.length > 0 && (
//         <Card className="border-0 shadow-sm">
//           <CardHeader className="pb-2 pt-4">
//             <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
//               Additional Evidence
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="pb-4">
//             <div className="grid grid-cols-3 gap-2">
//               {dispute.additionalEvidence.map((url, index) => (
//                 <a
//                   key={index}
//                   href={url}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:opacity-90 transition-opacity"
//                 >
//                   {/* eslint-disable-next-line @next/next/no-img-element */}
//                   <img
//                     src={url}
//                     alt={`Additional evidence ${index + 1}`}
//                     className="w-full h-full object-cover"
//                   />
//                 </a>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       <Separator />

//       {/* Support note */}
//       <p className="text-xs text-muted-foreground text-center pb-4">
//         Have questions about your dispute?{" "}
//         <Link href="/support" className="text-primary underline">
//           Contact support
//         </Link>
//       </p>
//     </main>
//   );
// }

// // ---------------------------------------------------------------------------
// // Page export with Suspense + ErrorBoundary
// // ---------------------------------------------------------------------------

// export default async function DisputeStatusPage({
//   params,
// }: {
//   params: Promise<{ orderId: string; disputeId: string }>;
// }) {
//   const { orderId, disputeId } = await params;
//   return (
//     <ErrorBoundary FallbackComponent={ErrorFallback}>
//       <Suspense
//         fallback={
//           <div className="max-w-lg mx-auto px-4 pt-10 space-y-4 animate-pulse">
//             {[...Array(4)].map((_, i) => (
//               <div key={i} className="h-24 rounded-xl bg-muted" />
//             ))}
//           </div>
//         }
//       >
//         <DisputeStatusContent orderId={orderId} disputeId={disputeId} />
//       </Suspense>
//     </ErrorBoundary>
//   );
// }

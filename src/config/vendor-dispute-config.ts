import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  LucideIcon,
} from "lucide-react";
import { DisputeStatus, DisputeOutcome } from "@/enums/financial.enums";

/**
 * Status configuration for vendor dispute dashboard
 */
export const vendorStatusConfig: Record<
  DisputeStatus,
  {
    label: string;
    badge: string;
    icon: LucideIcon;
    explanation: string;
    nextSteps: string;
  }
> = {
  [DisputeStatus.OPEN]: {
    label: "Under Review",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    icon: Clock,
    explanation:
      "The platform team is actively reviewing this dispute. Your funds remain frozen until a decision is made.",
    nextSteps:
      "Review typically takes 3-5 business days. We will notify you once a decision has been reached.",
  },
  [DisputeStatus.AWAITING_EVIDENCE]: {
    label: "Awaiting Customer Evidence",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    icon: AlertTriangle,
    explanation:
      "Additional evidence has been requested from the customer. Your funds remain frozen.",
    nextSteps:
      "No action is required from you. Once the customer submits evidence, our team will continue the review.",
  },
  [DisputeStatus.RESOLVED]: {
    label: "Resolved",
    badge:
      "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
    icon: CheckCircle2,
    explanation: "This dispute has been reviewed and resolved by our team.",
    nextSteps: "Review the resolution details below.",
  },
  [DisputeStatus.AUTO_RESOLVED]: {
    label: "Auto-Resolved",
    badge:
      "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
    icon: RefreshCw,
    explanation:
      "This dispute was automatically resolved after the review deadline.",
    nextSteps: "Review the resolution details below.",
  },
};

/**
 * Outcome configuration for vendor dispute dashboard
 */
export const vendorOutcomeConfig: Record<
  DisputeOutcome,
  {
    label: string;
    explanation: string;
    vendorMessage: string;
  }
> = {
  [DisputeOutcome.UPHELD]: {
    label: "Dispute Upheld",
    explanation:
      "The evidence provided by the customer supports their claim. This dispute has been resolved in the customer's favor.",
    vendorMessage:
      "The customer has been refunded. A penalty has been applied to your account as per platform policy.",
  },
  [DisputeOutcome.REJECTED]: {
    label: "Dispute Rejected",
    explanation:
      "After reviewing all evidence, our team determined that the dispute does not have sufficient grounds.",
    vendorMessage: "Your frozen funds have been released to your account.",
  },
  [DisputeOutcome.INCONCLUSIVE]: {
    label: "Inconclusive",
    explanation:
      "The available evidence was not sufficient to make a definitive decision.",
    vendorMessage:
      "Additional evidence was requested from the customer. We are awaiting their response.",
  },
};

/**
 * Timeline event configurations
 */
export const timelineEventConfig = {
  opened: {
    label: "Dispute Opened",
    description: "Customer initiated this dispute",
  },
  evidenceSubmitted: {
    label: "Evidence Submitted",
    description: "Customer provided evidence supporting their claim",
  },
  additionalEvidenceRequested: {
    label: "Additional Evidence Requested",
    description: "Platform requested more information from the customer",
  },
  additionalEvidenceReceived: {
    label: "Additional Evidence Received",
    description: "Customer submitted the requested evidence",
  },
  reviewStarted: {
    label: "Review Started",
    description: "Our team began the formal review process",
  },
  resolved: {
    label: "Dispute Resolved",
    description: "Decision has been made",
  },
};

/**
 * Financial status labels
 */
export const financialStatusLabels = {
  frozen: "Amount Frozen",
  penalty: "Penalty Applied",
  refunded: "Refunded to Customer",
  released: "Funds Released",
};

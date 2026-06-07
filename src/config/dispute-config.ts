import {
  Clock,
  Upload,
  CheckCircle2,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { DisputeStatus, DisputeOutcome } from "@/enums/financial.enums";

/**
 * Status configuration - maps dispute status to visual treatment and messaging
 */
export const statusConfig = {
  [DisputeStatus.OPEN]: {
    label: "Under Review",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    icon: Clock,
    description:
      "Our team is reviewing your dispute. We aim to resolve it within 5 business days.",
    nextStep: "You'll receive an email update when we've made a decision.",
    actionRequired: false,
  },
  [DisputeStatus.AWAITING_EVIDENCE]: {
    label: "More Evidence Needed",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
    icon: Upload,
    description:
      "Our team needs additional evidence to make a decision. Please submit more photos within 48 hours.",
    nextStep:
      "Submit additional evidence to help us resolve your dispute faster.",
    actionRequired: true,
  },
  [DisputeStatus.RESOLVED]: {
    label: "Resolved",
    color:
      "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
    icon: CheckCircle2,
    description: "This dispute has been resolved.",
    nextStep: "See the resolution details below.",
    actionRequired: false,
  },
  [DisputeStatus.AUTO_RESOLVED]: {
    label: "Auto-Resolved",
    color:
      "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
    icon: RefreshCw,
    description:
      "This dispute was automatically resolved because our team did not respond in time.",
    nextStep: "See the resolution details below.",
    actionRequired: false,
  },
} as const;

/**
 * Outcome configuration - maps dispute outcome to visual treatment and messaging
 */
export const outcomeConfig = {
  [DisputeOutcome.UPHELD]: {
    label: "Resolved in Your Favour",
    plainLanguage: "Your refund has been approved",
    color: "text-soraxi-green",
    icon: CheckCircle2,
    description: "Your dispute was upheld. A refund has been issued.",
  },
  [DisputeOutcome.REJECTED]: {
    label: "Resolved in Vendor's Favour",
    plainLanguage: "The dispute was not upheld",
    color: "text-destructive",
    icon: XCircle,
    description:
      "After reviewing the evidence, we could not uphold this dispute.",
  },
  [DisputeOutcome.INCONCLUSIVE]: {
    label: "Inconclusive",
    plainLanguage: "Additional evidence requested",
    color: "text-blue-600 dark:text-blue-400",
    icon: AlertTriangle,
    description: "Additional evidence has been requested.",
  },
} as const;

/**
 * Timeline event configuration
 */
export const timelineEventConfig = {
  OPENED: {
    label: "Dispute Opened",
    description: "You opened a dispute for this order",
  },
  EVIDENCE_SUBMITTED: {
    label: "Evidence Submitted",
    description: "You submitted evidence to support your dispute",
  },
  ADDITIONAL_EVIDENCE_REQUESTED: {
    label: "Additional Evidence Requested",
    description: "Our team requested more evidence to review your case",
  },
  ADDITIONAL_EVIDENCE_SUBMITTED: {
    label: "Additional Evidence Submitted",
    description: "You submitted additional evidence",
  },
  RESOLVED: {
    label: "Dispute Resolved",
    description: "A decision was made on your dispute",
  },
} as const;

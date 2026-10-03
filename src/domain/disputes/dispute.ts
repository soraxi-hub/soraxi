import { AppError } from "@/lib/errors/app-error";
import type { IDisputeRecord } from "@/lib/db/models/dispute-record.model";
import {
  DisputeOutcome,
  DisputeResolvedBy,
  DisputeStatus,
} from "@/enums/financial.enums";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { formatNaira, koboToNaira } from "@/lib/utils/naira";
import { ADDITIONAL_EVIDENCE_WINDOW_HOURS } from "@/constants/financial.constants";

/** Pure dispute lifecycle rules. */
export class Dispute {
  constructor(private readonly props: IDisputeRecord) {}

  // -------------------------------------------------------------------------
  // IDENTIFIERS
  // -------------------------------------------------------------------------

  get disputeId(): string {
    return this.props._id.toString();
  }

  get orderId(): string {
    return this.props.orderId.toString();
  }

  get suborderId(): string {
    return this.props.suborderId.toString();
  }

  get customerId(): string {
    return this.props.customerId.toString();
  }

  get vendorId(): string {
    return this.props.vendorId.toString();
  }

  // -------------------------------------------------------------------------
  // STATUS & OUTCOME
  // -------------------------------------------------------------------------

  get status(): DisputeStatus {
    return this.props.status;
  }

  get outcome(): DisputeOutcome | undefined {
    return this.props.outcome;
  }

  get isOpen(): boolean {
    return this.props.status === DisputeStatus.OPEN;
  }

  get isAwaitingEvidence(): boolean {
    return this.props.status === DisputeStatus.AWAITING_EVIDENCE;
  }

  get isResolved(): boolean {
    return (
      this.props.status === DisputeStatus.RESOLVED ||
      this.props.status === DisputeStatus.AUTO_RESOLVED
    );
  }

  get isTerminal(): boolean {
    return this.isResolved;
  }

  get wasResolvedBySystem(): boolean {
    return this.props.resolvedBy === DisputeResolvedBy.SYSTEM;
  }

  // -------------------------------------------------------------------------
  // EVIDENCE
  // -------------------------------------------------------------------------

  get reason(): string {
    return this.props.reason;
  }

  get evidence(): string[] {
    return this.props.evidence;
  }

  get additionalEvidence(): string[] {
    return this.props.additionalEvidence ?? [];
  }

  get hasAdditionalEvidence(): boolean {
    return this.additionalEvidence.length > 0;
  }

  /** True when the customer has been asked for more evidence. */
  get isAdditionalEvidenceRequested(): boolean {
    return !!this.props.additionalEvidenceRequestedAt;
  }

  // -------------------------------------------------------------------------
  // FINANCIALS — value pairs (kobo / naira / formatted), matching Order
  // -------------------------------------------------------------------------

  /** Raw kobo amount frozen from the vendor's balance when the dispute opened. */
  get frozenAmount(): number {
    return this.props.frozenAmount;
  }

  /** Naira equivalent of frozenAmount. */
  get frozenAmountInNaira(): number {
    return koboToNaira(this.props.frozenAmount);
  }

  /** Display-ready frozen amount. Example: ₦5,000 */
  get formattedFrozenAmount(): string {
    return formatNaira(this.props.frozenAmount);
  }

  /** Raw kobo penalty applied to the vendor — 0 unless the dispute is upheld. */
  get penaltyAmount(): number {
    return this.props.penaltyAmount;
  }

  /** Naira equivalent of penaltyAmount. */
  get penaltyAmountInNaira(): number {
    return koboToNaira(this.props.penaltyAmount);
  }

  /** Display-ready penalty amount. Example: ₦500 */
  get formattedPenaltyAmount(): string {
    return formatNaira(this.props.penaltyAmount);
  }

  get hasPenalty(): boolean {
    return this.props.penaltyAmount > 0;
  }

  // -------------------------------------------------------------------------
  // TIMELINE
  // -------------------------------------------------------------------------

  get openedAt(): Date {
    return this.props.openedAt;
  }

  get deadline(): Date {
    return this.props.deadline;
  }

  get warningIssuedAt(): Date | undefined {
    return this.props.warningIssuedAt;
  }

  get resolvedAt(): Date | undefined {
    return this.props.resolvedAt;
  }

  get additionalEvidenceRequestedAt(): Date | undefined {
    return this.props.additionalEvidenceRequestedAt;
  }

  get additionalEvidenceDeadline(): Date | undefined {
    return this.props.additionalEvidenceDeadline;
  }

  get resolvedBy(): DisputeResolvedBy | undefined {
    return this.props.resolvedBy;
  }

  get resolutionNotes(): string | undefined {
    return this.props.resolutionNotes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /** True when the dispute deadline has passed. */
  isOverdue(now: Date = new Date()): boolean {
    return !this.isResolved && now > this.props.deadline;
  }

  /** True when a day-4 warning has already been sent. */
  get hasWarningBeenIssued(): boolean {
    return !!this.props.warningIssuedAt;
  }

  /**
   * Business days left to resolve.
   */
  get businessDaysRemaining(): number | null {
    if (!this.isOpen && !this.isAwaitingEvidence) return null;
    return DateFormatter.businessDaysUntil(this.props.deadline, [0, 6]);
  }

  // -------------------------------------------------------------------------
  // INVARIANT GUARDS
  // -------------------------------------------------------------------------

  assertResolvable(): void {
    if (
      this.props.status !== DisputeStatus.OPEN &&
      this.props.status !== DisputeStatus.AWAITING_EVIDENCE
    ) {
      throw new AppError(
        "BAD_REQUEST",
        `Dispute is already in a terminal state: ${this.props.status}. It cannot be resolved again.`,
      );
    }
  }

  assertCanRequestEvidence(): void {
    if (this.props.status !== DisputeStatus.OPEN) {
      throw new AppError(
        "BAD_REQUEST",
        this.props.status === DisputeStatus.AWAITING_EVIDENCE
          ? "Additional evidence has already been requested for this dispute."
          : `Dispute cannot be marked inconclusive in its current state: ${this.props.status}.`,
      );
    }
  }

  assertCanSubmitEvidence(now: Date): void {
    if (this.props.status !== DisputeStatus.AWAITING_EVIDENCE) {
      throw new AppError(
        "BAD_REQUEST",
        "Additional evidence cannot be submitted for this dispute in its current state.",
      );
    }
    if (
      this.props.additionalEvidenceDeadline &&
      now > this.props.additionalEvidenceDeadline
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "The evidence submission window has expired. The dispute will be resolved shortly.",
      );
    }
  }

  // -------------------------------------------------------------------------
  // STATE TRANSITIONS
  // -------------------------------------------------------------------------

  /**
   * Transition to AWAITING_EVIDENCE and record the 48-hour response window.
   * Called when the platform team cannot decide on the evidence already
   * submitted and needs more from the customer.
   */
  requestAdditionalEvidence(now: Date = new Date()) {
    this.assertCanRequestEvidence();

    const deadline48h = new Date(
      now.getTime() + ADDITIONAL_EVIDENCE_WINDOW_HOURS * 60 * 60 * 1000,
    );

    this.props.status = DisputeStatus.AWAITING_EVIDENCE;
    this.props.outcome = DisputeOutcome.INCONCLUSIVE;
    this.props.additionalEvidenceRequestedAt = now;
    this.props.additionalEvidenceDeadline = deadline48h;
  }

  /**
   * Record additional evidence from the customer and reopen the dispute
   * for re-evaluation.
   */
  submitAdditionalEvidence(evidence: string[], now: Date = new Date()) {
    this.assertCanSubmitEvidence(now);

    this.props.additionalEvidence = evidence;
    this.props.status = DisputeStatus.OPEN;
  }

  /**
   * Produce the resolution payload for the application service to persist.
   * Does not mutate the aggregate — persistence and financial effects belong
   * to the coordinating service.
   */
  resolution(
    outcome: DisputeOutcome,
    resolvedBy: DisputeResolvedBy,
    penaltyAmount: number,
    resolutionNotes?: string,
  ) {
    this.assertResolvable();

    return {
      status:
        resolvedBy === DisputeResolvedBy.SYSTEM
          ? DisputeStatus.AUTO_RESOLVED
          : DisputeStatus.RESOLVED,
      outcome,
      resolvedBy,
      penaltyAmount,
      resolvedAt: new Date(),
      ...(resolutionNotes ? { resolutionNotes } : {}),
    };
  }

  /**
   * Returns the aggregate's underlying record for persistence.
   *
   * Do not spread this into a full document  replace — it includes identity fields that are immutable after open.
   */
  toPersistence(): IDisputeRecord {
    return this.props;
  }

  // -------------------------------------------------------------------------
  // DTOs
  // -------------------------------------------------------------------------
  toAdminListJSON() {
    return {
      disputeId: this.disputeId,
      status: this.status,
      outcome: this.outcome ?? null,
      frozenAmount: this.frozenAmount,
      frozenAmountInNaira: this.frozenAmountInNaira,
      formattedFrozenAmount: this.formattedFrozenAmount,
      openedAt: this.openedAt,
      deadline: this.deadline,
      resolvedAt: this.resolvedAt ?? null,
      businessDaysRemaining: this.businessDaysRemaining,
      orderId: this.orderId,
      suborderId: this.suborderId,
      studentId: this.customerId,
      vendorId: this.vendorId,
    };
  }

  toAdminDetailJSON() {
    return {
      disputeId: this.disputeId,
      status: this.status,
      outcome: this.outcome ?? null,
      reason: this.reason,
      evidence: this.evidence,
      additionalEvidence: this.additionalEvidence,
      frozenAmount: this.frozenAmount,
      frozenAmountInNaira: this.frozenAmountInNaira,
      formattedFrozenAmount: this.formattedFrozenAmount,
      penaltyAmount: this.penaltyAmount,
      penaltyAmountInNaira: this.penaltyAmountInNaira,
      formattedPenaltyAmount: this.formattedPenaltyAmount,
      openedAt: this.openedAt,
      deadline: this.deadline,
      businessDaysRemaining: this.businessDaysRemaining,
      warningIssuedAt: this.warningIssuedAt ?? null,
      resolvedAt: this.resolvedAt ?? null,
      resolvedBy: this.resolvedBy ?? null,
      resolutionNotes: this.resolutionNotes ?? null,
      additionalEvidenceDeadline: this.additionalEvidenceDeadline ?? null,
      orderId: this.orderId,
      suborderId: this.suborderId,
      studentId: this.customerId,
      vendorId: this.vendorId,
    };
  }
}

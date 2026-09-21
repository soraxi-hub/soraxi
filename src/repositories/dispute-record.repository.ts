import mongoose from "mongoose";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import {
  DisputeOutcome,
  DisputeResolvedBy,
  DisputeStatus,
} from "@/enums/financial.enums";
import {
  getDisputeRecordModel,
  type IDisputeRecord,
  type IDisputeRecordDocument,
} from "@/lib/db/models/dispute-record.model";
import { Dispute } from "@/domain/disputes/dispute";

const ACTIVE_STATUSES = [
  DisputeStatus.OPEN,
  DisputeStatus.AWAITING_EVIDENCE,
] as const;

export class DisputeRepository {
  static async findById(
    disputeId: string,
    session?: mongoose.ClientSession,
  ): Promise<IDisputeRecordDocument | null> {
    const Model = await getDisputeRecordModel();
    return QueryBuilderFactory.queryBuilder<
      IDisputeRecord,
      IDisputeRecordDocument
    >(Model)
      .customFilter({ _id: new mongoose.Types.ObjectId(disputeId) })
      .withLean(false)
      .withMongoDBsession(session ?? null)
      .executeOne();
  }

  static async findActiveBySuborderId(
    suborderId: string,
  ): Promise<IDisputeRecordDocument | null> {
    const Model = await getDisputeRecordModel();
    return QueryBuilderFactory.queryBuilder<
      IDisputeRecord,
      IDisputeRecordDocument
    >(Model)
      .customFilter({
        suborderId: new mongoose.Types.ObjectId(suborderId),
      })
      .whereIn("status", [...ACTIVE_STATUSES])
      .withLean(false)
      .executeOne();
  }

  /**
   * Create a new dispute record when a customer opens a dispute.
   *
   * @param data - Dispute record data
   * @returns The created dispute record document
   */
  static async create(
    data: Omit<IDisputeRecord, "createdAt" | "updatedAt">,
    session: mongoose.ClientSession,
  ): Promise<IDisputeRecordDocument> {
    const Model = await getDisputeRecordModel();
    return new Model(data).save({ session });
  }

  /**
   * Get all open disputes — used by the platform team's dispute management dashboard.
   * Returns disputes in ascending deadline order so the most urgent appear first.
   *
   * @returns Array of open dispute records
   */
  static async getOpen(): Promise<IDisputeRecord[]> {
    const Model = await getDisputeRecordModel();
    return QueryBuilderFactory.queryBuilder<
      IDisputeRecord,
      IDisputeRecordDocument
    >(Model)
      .whereIn("status", [...ACTIVE_STATUSES])
      .sortBy("deadline", "asc")
      .withLean(true)
      .execute();
  }

  /**
   * Get all disputes that have passed their deadline without resolution.
   * Used by the background job that triggers auto-resolution.
   *
   * @returns Array of overdue unresolved dispute records
   */
  static async getOverdue(): Promise<IDisputeRecordDocument[]> {
    const Model = await getDisputeRecordModel();
    return QueryBuilderFactory.queryBuilder<
      IDisputeRecord,
      IDisputeRecordDocument
    >(Model)
      .whereIn("status", [...ACTIVE_STATUSES])
      .customFilter({ deadline: { $lte: new Date() } })
      .withLean(false)
      .execute();
  }

  /**
   * Get all disputes approaching their deadline within the next 24 hours.
   * Used by the background job that sends day-4 warning alerts to the platform team.
   *
   * @returns Array of dispute records approaching their deadline
   */
  static async getApproachingDeadline(): Promise<IDisputeRecord[]> {
    const Model = await getDisputeRecordModel();

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return QueryBuilderFactory.queryBuilder<
      IDisputeRecord,
      IDisputeRecordDocument
    >(Model)
      .whereIn("status", [...ACTIVE_STATUSES])
      .whereBetween("deadline", now, in24Hours)
      .where("warningIssuedAt", null as unknown as Date)
      .withLean(true)
      .execute();
  }

  /**
   * Get all disputes still awaiting additional evidence whose 48-hour
   * response window has passed. Used by the background job that
   * auto-rejects disputes the customer never followed up on.
   *
   * @returns Array of expired AWAITING_EVIDENCE dispute records
   */
  static async getAwaitingEvidenceExpired(): Promise<IDisputeRecordDocument[]> {
    const Model = await getDisputeRecordModel();
    return QueryBuilderFactory.queryBuilder<
      IDisputeRecord,
      IDisputeRecordDocument
    >(Model)
      .where("status", DisputeStatus.AWAITING_EVIDENCE)
      .customFilter({ additionalEvidenceDeadline: { $lte: new Date() } })
      .withLean(false)
      .execute();
  }

  /**
   * Mark a dispute's day-4 warning as sent.
   *
   * @param id - The _id of the dispute record
   * @returns Updated dispute record document or null
   */
  static async markWarningSent(id: string): Promise<IDisputeRecord | null> {
    const Model = await getDisputeRecordModel();
    return Model.findByIdAndUpdate<IDisputeRecord>(
      id,
      { $set: { warningIssuedAt: new Date() } },
      { new: true },
    );
  }

  /**
   * Resolve a dispute with a final outcome.
   * Used for both manual resolution by the platform team and
   * automatic resolution by the background job.
   *
   * @param id - The _id of the dispute record
   * @param outcome - The final outcome of the dispute
   * @param resolvedBy - Whether resolved by team or system
   * @param penaltyAmount - Penalty applied in Kobo — 0 if not upheld
   * @param resolutionNotes - Optional notes from the resolver
   * @returns Updated dispute record document or null
   */
  static async resolve(
    disputeId: string,
    update: {
      outcome: DisputeOutcome;
      resolvedBy: DisputeResolvedBy;
      penaltyAmount: number;
      resolutionNotes?: string;
    },
    session: mongoose.ClientSession,
  ): Promise<IDisputeRecordDocument | null> {
    const status =
      update.resolvedBy === DisputeResolvedBy.SYSTEM
        ? DisputeStatus.AUTO_RESOLVED
        : DisputeStatus.RESOLVED;
    const Model = await getDisputeRecordModel();
    return Model.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(disputeId),
        status: { $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE] },
      },
      {
        $set: {
          status,
          outcome: update.outcome,
          resolvedBy: update.resolvedBy,
          penaltyAmount: update.penaltyAmount,
          resolvedAt: new Date(),
          ...(update.resolutionNotes
            ? { resolutionNotes: update.resolutionNotes }
            : {}),
        },
      },
      { new: true, session },
    );
  }

  /**
   * Persist the current state of a Dispute aggregate.
   *
   * Writes only the fields the aggregate owns, guarded by an atomic status
   * filter so two concurrent transitions can't both succeed. Returns `null`
   * when the guard no longer matches — i.e. another writer moved the dispute
   * out of a mutably-reachable state between the caller's read and this write.
   *
   * @param dispute - The aggregate whose props should be persisted
   * @param session - Optional Mongo session for transactional writes
   * @returns Updated dispute record document, or null if the guard failed
   */
  static async save(
    dispute: Dispute,
    session?: mongoose.ClientSession,
  ): Promise<IDisputeRecordDocument | null> {
    const Model = await getDisputeRecordModel();
    const props = dispute.toPersistence();

    return Model.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(dispute.disputeId),
        // Only allow the write while the dispute is still mutable. A terminal
        // dispute (RESOLVED / AUTO_RESOLVED) must not be re-written by a stale
        // aggregate that loaded before resolution.
        status: {
          $in: [DisputeStatus.OPEN, DisputeStatus.AWAITING_EVIDENCE],
        },
      },
      {
        $set: {
          status: props.status,
          outcome: props.outcome ?? null,
          penaltyAmount: props.penaltyAmount,
          warningIssuedAt: props.warningIssuedAt ?? null,
          resolvedAt: props.resolvedAt ?? null,
          resolvedBy: props.resolvedBy ?? null,
          resolutionNotes: props.resolutionNotes ?? null,
          additionalEvidenceRequestedAt:
            props.additionalEvidenceRequestedAt ?? null,
          additionalEvidenceDeadline: props.additionalEvidenceDeadline ?? null,
          additionalEvidence: props.additionalEvidence ?? [],
        },
      },
      { new: true, session },
    );
  }
}

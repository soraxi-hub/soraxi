import { Payout } from "@/domain/payout/models/payout";
import { PayoutStatus } from "@/enums/financial.enums";
import mongoose from "mongoose";

export interface IPayoutRepository {
  /**
   * Creates a new payout record.
   * @param payout - The domain model (must have INITIATED status).
   * @returns The created domain model with generated ID.
   */
  create(
    payout: Payout,
    session: mongoose.ClientSession | null,
  ): Promise<Payout>;

  /**
   * Finds a payout by its ID.
   * @param id - Payout record ID.
   * @returns Domain model or null if not found.
   */
  findById(id: string): Promise<Payout | null>;

  /**
   * Finds a payout by Flutterwave transfer ID.
   * @param transferId - Flutterwave transfer ID.
   * @returns Domain model or null.
   */
  findByFlutterwaveTransferId(transferId: string): Promise<Payout | null>;

  /**
   * Finds all payouts for a vendor (store), with pagination.
   * @param vendorId - Store ID.
   * @param page - Page number (1-indexed).
   * @param limit - Items per page.
   * @param status - Optional filter by status.
   * @returns Array of domain models and total count.
   */
  findByVendorId(
    vendorId: string,
    page: number,
    limit: number,
    status?: PayoutStatus | "all",
  ): Promise<{ payouts: Payout[]; total: number }>;

  /**
   * Marks a payout as PROCESSING and attaches Flutterwave transfer ID.
   * @param id - Payout ID.
   * @param transferId - Flutterwave transfer ID.
   * @param status - Optional Flutterwave status.
   * @returns Updated domain model.
   */
  markProcessing(
    id: string,
    flutterwaveTransferId: string,
    session: mongoose.ClientSession | null,
  ): Promise<void>;

  /**
   * Marks a payout as COMPLETED.
   * @param id - Payout ID.
   * @returns Updated domain model.
   */
  markCompleted(
    id: string,
    session: mongoose.ClientSession | null,
  ): Promise<Payout>;

  /**
   * Marks a payout as FAILED with a reason.
   * @param id - Payout ID.
   * @param reason - Failure reason.
   * @returns Updated domain model.
   */
  markFailed(
    id: string,
    reason: string,
    session: mongoose.ClientSession,
  ): Promise<Payout>;
}

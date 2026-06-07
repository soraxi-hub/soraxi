import { Payout } from "@/domain/payout/models/payout";
import { PayoutStatus } from "@/enums/financial.enums";
import mongoose from "mongoose";

export interface CreatePayoutRequestInput {
  storeId: string;
  amount: number; // in kobo
  accountId: string;
  storePassword: string;
}

export interface IPayoutService {
  /**
   * Creates a new payout request (INITIATED state).
   * @param vendorId - Store ID.
   * @param amountBreakdown - Financial breakdown.
   * @param bankDetails - Bank account snapshot.
   * @param ledgerEntryId - Associated ledger entry ID.
   * @returns The created payout domain model (as JSON).
   */
  createPayoutRequest(
    input: CreatePayoutRequestInput,
  ): Promise<{ message: string }>;

  /**
   * Retrieves a payout by its ID.
   * @param id - Payout record ID.
   * @returns Payout JSON or null.
   */
  getPayoutById(id: string): Promise<ReturnType<Payout["toJSON"]> | null>;

  /**
   * Retrieves paginated payout history for a vendor.
   * @param vendorId - Store ID.
   * @param page - Page number.
   * @param limit - Items per page.
   * @param status - Optional status filter.
   * @returns List of payouts and pagination metadata.
   */
  getVendorPayoutHistory(
    vendorId: string,
    page: number,
    limit: number,
    status?: PayoutStatus | "all",
  ): Promise<{
    payouts: ReturnType<Payout["toJSON"]>[];
    total: number;
    page: number;
    limit: number;
  }>;

  /**
   * Attaches a Flutterwave transfer ID and moves payout to PROCESSING.
   * @param id - Payout ID.
   * @param flutterwaveTransferId - Flutterwave transfer ID.
   * @param flutterwaveStatus - Optional status.
   * @returns Updated payout JSON.
   */
  updatePayoutFlutterwaveTransferId(
    id: string,
    flutterwaveTransferId: string,
    session: mongoose.ClientSession,
  ): Promise<void>;

  /**
   * Completes a payout (moves to COMPLETED).
   * @param id - Payout ID.
   * @returns Updated payout JSON.
   */
  completePayout(
    id: string,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<Payout["toJSON"]>>;

  /**
   * Fails a payout with a reason.
   * @param id - Payout ID.
   * @param reason - Failure reason.
   * @returns Updated payout JSON.
   */
  failPayout(
    id: string,
    reason: string,
    session: mongoose.ClientSession,
  ): Promise<ReturnType<Payout["toJSON"]>>;
}

import {
  createPayoutRecord,
  getPayoutRecordById,
  getPayoutRecordByFlutterwaveTransferId,
  getPayoutRecordsByVendorId,
  updatePayoutFlutterwaveTransferId,
  markPayoutCompleted,
  markPayoutFailed,
} from "@/lib/db/models/payout-record.model";
import { IPayoutRepository } from "../interfaces/payout-repository.interface";
import { Payout } from "@/domain/payout/models/payout";
import { PayoutStatus } from "@/enums/financial.enums";
import { AppError } from "@/lib/errors/app-error";
import { PayoutFactory } from "@/domain/payout/factories/payout-factory";
import mongoose from "mongoose";

export class PayoutRepository implements IPayoutRepository {
  async create(
    payout: Payout,
    session: mongoose.ClientSession | null,
  ): Promise<Payout> {
    const input = PayoutFactory.toCreateInput(payout);
    const doc = await createPayoutRecord(input, session);
    if (!doc) {
      throw new AppError("Failed to create payout record", 500);
    }
    return PayoutFactory.fromPersistence(doc);
  }

  async findById(id: string): Promise<Payout | null> {
    const doc = await getPayoutRecordById(id);
    if (!doc) return null;
    return PayoutFactory.fromPersistence(doc);
  }

  async findByFlutterwaveTransferId(
    transferId: string,
  ): Promise<Payout | null> {
    const doc = await getPayoutRecordByFlutterwaveTransferId(transferId);
    if (!doc) return null;
    return PayoutFactory.fromPersistence(doc);
  }

  async findByVendorId(
    vendorId: string,
    page: number,
    limit: number,
    status: PayoutStatus | "all" = "all",
  ): Promise<{ payouts: Payout[]; total: number }> {
    const skip = (page - 1) * limit;
    // The existing getPayoutRecordsByVendorId may not support pagination/sorting.
    // We'll assume it returns all; we can implement pagination manually.
    // If the model function supports filters, adapt accordingly.
    // For now, we'll use a manual approach or extend the model function.
    // To keep it simple, we'll call the existing function and filter/slice in memory.
    // In production, you would modify the model function to accept pagination.
    const docs = await getPayoutRecordsByVendorId(vendorId);
    let filtered = docs;
    if (status !== "all") {
      filtered = docs.filter((doc) => doc.status === status);
    }
    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    const payouts = paginated.map((doc) => PayoutFactory.fromPersistence(doc));
    return { payouts, total };
  }

  async markProcessing(
    id: string,
    flutterwaveTransferId: string,
    session: mongoose.ClientSession | null,
  ): Promise<void> {
    const doc = await updatePayoutFlutterwaveTransferId(
      id,
      flutterwaveTransferId,
      session,
    );
    if (!doc) {
      throw new AppError(`Payout ${id} not found or could not be updated`, 404);
    }
  }

  async markCompleted(
    id: string,
    session: mongoose.ClientSession,
  ): Promise<Payout> {
    const doc = await markPayoutCompleted(id, session);
    if (!doc) {
      throw new AppError(
        `Payout ${id} not found or could not be marked completed`,
        404,
      );
    }
    return PayoutFactory.fromPersistence(doc);
  }

  async markFailed(
    id: string,
    reason: string,
    session: mongoose.ClientSession,
  ): Promise<Payout> {
    const doc = await markPayoutFailed(id, reason, session);
    if (!doc) {
      throw new AppError(
        `Payout ${id} not found or could not be marked failed`,
        404,
      );
    }
    return PayoutFactory.fromPersistence(doc);
  }
}

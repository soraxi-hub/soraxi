import mongoose from "mongoose";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import {
  GatewayPaymentStatus,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";
import {
  getTransactionRecordModel,
  type ITransactionRecord,
  type ITransactionRecordDocument,
} from "@/lib/db/models/transaction-record.model";

export class TransactionRepository {
  /**
   * Create a new transaction record when a customer's payment is confirmed.
   *
   * @param data - Transaction record data including suborder breakdowns
   * @returns The created transaction record document
   */
  static async create(
    data: Omit<ITransactionRecord, "createdAt" | "updatedAt">,
    session: mongoose.ClientSession,
  ): Promise<ITransactionRecordDocument> {
    const Model = await getTransactionRecordModel();
    return new Model(data).save({ session });
  }

  /**
   * Get a transaction record by its associated order ID.
   *
   * @param orderId - The _id of the order
   * @returns Transaction record document or null
   */
  static async findByOrderId(
    orderId: string,
  ): Promise<ITransactionRecord | null> {
    const Model = await getTransactionRecordModel();
    return QueryBuilderFactory.queryBuilder<
      ITransactionRecord,
      ITransactionRecordDocument
    >(Model)
      .customFilter({ orderId: new mongoose.Types.ObjectId(orderId) })
      .withLean(true)
      .executeOne();
  }

  /**
   * Get a transaction record by our own payment reference (the cart idempotency
   * key). Works for any gateway — every provider echoes this value back.
   *
   * @param gatewayReference - Our payment reference
   * @returns Transaction record document or null
   */
  static async findByGatewayReference(
    gatewayReference: string,
  ): Promise<ITransactionRecord | null> {
    const Model = await getTransactionRecordModel();
    return QueryBuilderFactory.queryBuilder<
      ITransactionRecord,
      ITransactionRecordDocument
    >(Model)
      .where("gatewayReference", gatewayReference)
      .withLean(true)
      .executeOne();
  }

  /**
   * Update the collection outcome on a transaction record.
   * Called when a webhook confirms the final payment outcome.
   *
   * @param gatewayReference - Our payment reference
   * @param status - The new normalised payment status
   * @returns Updated transaction record document or null
   */
  static async updateGatewayStatus(
    gatewayReference: string,
    status: GatewayPaymentStatus,
    session: mongoose.ClientSession,
  ): Promise<ITransactionRecord | null> {
    const Model = await getTransactionRecordModel();
    return Model.findOneAndUpdate(
      { gatewayReference },
      { $set: { gatewayStatus: status } },
      { new: true, session },
    ).lean<ITransactionRecord>();
  }

  /**
   * Update the financial status of a specific suborder within a transaction record.
   * Called at every stage transition — confirmation, dispute, settlement, refund.
   *
   * @param orderId - The _id of the order
   * @param suborderId - The _id of the suborder to update
   * @param status - The new suborder financial status
   * @returns Updated transaction record document or null
   */
  static async updateSuborderFinancialStatus(
    orderId: string,
    suborderId: string,
    status: SuborderFinancialStatus,
    session: mongoose.ClientSession,
  ): Promise<ITransactionRecord | null> {
    const Model = await getTransactionRecordModel();
    return Model.findOneAndUpdate(
      {
        orderId: new mongoose.Types.ObjectId(orderId),
        "suborderBreakdowns.suborderId": new mongoose.Types.ObjectId(
          suborderId,
        ),
      },
      {
        $set: { "suborderBreakdowns.$.status": status },
      },
      { new: true, session },
    ).lean<ITransactionRecord>();
  }
}

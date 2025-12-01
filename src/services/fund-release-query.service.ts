/**
 * Fund Release Query Service
 * OOP-based service for querying and filtering fund releases
 * Handles pagination, filtering, and sorting logic
 */

import {
  FundReleaseStatus,
  getFundReleaseModel,
  type IFundRelease,
} from "@/lib/db/models/fund-release.model";
import { getOrderModel, IOrder, ISubOrder } from "@/lib/db/models/order.model";
import { TRPCError } from "@trpc/server";
import type { FilterQuery, QueryOptions } from "mongoose";
import mongoose from "mongoose";

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface QueryFilters {
  storeId?: string;
  status?: FundReleaseStatus;
  orderId?: string;
}

interface SortOptions {
  field: "createdAt" | "scheduledReleaseTime" | "actualReleasedAt" | "amount";
  order: "asc" | "desc";
}

interface QueryResult {
  data: IFundRelease[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FundReleaseSummaryItem {
  _id: FundReleaseStatus;
  count: number;
  totalAmount: number;
}

/**
 * FundReleaseQueryService - Query and filter fund releases with pagination
 * @class
 */
export class FundReleaseQueryService {
  /**
   * Fetch paginated fund releases with filters and sorting
   * @param storeId - Store ID to filter by (required for seller dashboard)
   * @param filters - Additional filters
   * @param pagination - Page and page size
   * @param sort - Sort options
   * @returns QueryResult with paginated data and metadata
   */
  static async getStoreFundReleases(
    storeId: string,
    filters: Omit<QueryFilters, "storeId"> = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 },
    sort: SortOptions = { field: "createdAt", order: "desc" }
  ): Promise<QueryResult> {
    const FundRelease = await getFundReleaseModel();

    // Build query filter
    const query: FilterQuery<IFundRelease> = { storeId };

    // Add optional filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.orderId) {
      query.orderId = filters.orderId;
    }

    // Build sort object
    const sortObj: QueryOptions["sort"] = {
      [sort.field]: sort.order === "asc" ? 1 : -1,
    };

    // Get total count for pagination
    const total = await FundRelease.countDocuments(query);

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.pageSize;
    const totalPages = Math.ceil(total / pagination.pageSize);

    // Execute query with pagination and sorting
    const data = await FundRelease.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(pagination.pageSize)
      .lean<IFundRelease[]>() // Use lean for better performance
      .exec();

    return {
      data,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
    };
  }

  /**
   * Get summary statistics for a store's fund releases
   * @param storeId - Store ID
   * @returns Summary statistics
   */

  static async getStoreSummaryStats(
    storeId: string
  ): Promise<
    Record<FundReleaseStatus, { count: number; totalAmount: number }>
  > {
    const FundRelease = await getFundReleaseModel();

    const stats = await FundRelease.aggregate<FundReleaseSummaryItem>([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$settlement.amount" },
        },
      },
    ]);

    // Initialize default object with 0s
    const summary: Record<
      FundReleaseStatus,
      { count: number; totalAmount: number }
    > = {
      [FundReleaseStatus.Pending]: { count: 0, totalAmount: 0 },
      [FundReleaseStatus.Ready]: { count: 0, totalAmount: 0 },
      [FundReleaseStatus.Processing]: { count: 0, totalAmount: 0 },
      [FundReleaseStatus.Released]: { count: 0, totalAmount: 0 },
      [FundReleaseStatus.Failed]: { count: 0, totalAmount: 0 },
      [FundReleaseStatus.Reversed]: { count: 0, totalAmount: 0 },
    };

    // Map aggregation results into the summary object
    for (const item of stats) {
      summary[item._id] = { count: item.count, totalAmount: item.totalAmount };
    }

    return summary;
  }

  /**
  Fetch a single fund release by ID with order context
  @param fundReleaseId - Fund release ObjectId
  @param storeId - Store ID for access validation
  @returns Populated IFundRelease or null if not found
  */
  static async getFundReleaseById(
    fundReleaseId: string,
    storeId: string
  ): Promise<{
    fundRelease: IFundRelease;
    relatedSubOrder: ISubOrder;
  }> {
    if (
      !mongoose.Types.ObjectId.isValid(fundReleaseId) ||
      !mongoose.Types.ObjectId.isValid(storeId)
    ) {
      throw new Error("Invalid fund release ID or store ID");
    }

    const FundRelease = await getFundReleaseModel();
    const fundRelease = await FundRelease.findOne({
      _id: new mongoose.Types.ObjectId(fundReleaseId),
      storeId: new mongoose.Types.ObjectId(storeId),
    })
      .select("-walletId -adminNotes -metadata")
      .lean<IFundRelease>()
      .exec();

    if (!fundRelease) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Fund release not found",
      });
    }

    const Order = await getOrderModel();
    const order = await Order.findById(fundRelease.orderId)
      .select("subOrders")
      .lean<IOrder>()
      .exec();

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Associated order not found for this fund release",
      });
    }

    const relatedSubOrder = order.subOrders.find(
      (s) => s._id.toString() === fundRelease.subOrderId.toString()
    );

    if (!relatedSubOrder) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Associated sub order not found for this fund release",
      });
    }

    return {
      fundRelease,
      relatedSubOrder,
    };
  }

  /**
   * Validate and normalize pagination parameters
   * @param page - Page number
   * @param pageSize - Page size
   * @returns Validated pagination params
   */
  static validatePagination(
    page?: string | number | null,
    pageSize?: string | number | null
  ): PaginationParams {
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedPageSize = Math.min(
      100,
      Math.max(1, Number(pageSize) || 20)
    ); // Max 100 per page

    return { page: normalizedPage, pageSize: normalizedPageSize };
  }
}

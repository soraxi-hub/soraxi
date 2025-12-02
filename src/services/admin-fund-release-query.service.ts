/**
 * Admin Fund Release Query Service
 * OOP-based service for querying all fund releases (cross-store)
 * Includes admin-specific filters like store tier, risk level, and date range
 */

import {
  FundReleaseStatus,
  getFundReleaseModel,
  type StoreTierEnum,
  type IFundRelease,
  FundReleaseTrigger,
} from "@/lib/db/models/fund-release.model";
import { getOrderModel, IOrder } from "@/lib/db/models/order.model";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { AdminTokenData } from "@/lib/helpers/get-admin-from-cookie";
import {
  processFundRelease,
  reverseProcessedFundRelease,
} from "@/lib/utils/fund-release-service";
import { TRPCError } from "@trpc/server";
import type { FilterQuery, QueryOptions } from "mongoose";
import { AuditLogService } from "./audit-log.service";

interface PaginationParams {
  page: number;
  pageSize: number;
}

interface AdminQueryFilters {
  status?: FundReleaseStatus;
  storeTier?: StoreTierEnum;
  riskLevel?: "high" | "medium" | "low";
  dateFrom?: Date;
  dateTo?: Date;
  storeId?: string;
  orderId?: string;
}

interface SortOptions {
  field:
    | "createdAt"
    | "scheduledReleaseTime"
    | "actualReleasedAt"
    | "settlement.amount";
  order: "asc" | "desc";
}

interface QueryResult {
  data: IFundRelease[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AdminDashboardStats {
  totalPending: number;
  totalReady: number;
  totalReleased: number;
  totalFailed: number;
  totalAmount: number;
  highRiskCount: number;
}

/**
 * AdminFundReleaseQueryService - Query all fund releases with admin filters
 */
export class AdminFundReleaseQueryService {
  /**
   * Fetch paginated fund releases with admin filters
   */
  static async getAllFundReleases(
    filters: AdminQueryFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 20 },
    sort: SortOptions = { field: "createdAt", order: "desc" }
  ): Promise<QueryResult> {
    const FundRelease = await getFundReleaseModel();

    const query: FilterQuery<IFundRelease> = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.storeTier) {
      query["releaseRules.storeTier"] = filters.storeTier;
    }

    if (filters.riskLevel === "high") {
      query["riskIndicators.isHighRiskStore"] = true;
    } else if (filters.riskLevel === "medium") {
      query["riskIndicators.flags"] = { $exists: true, $ne: [] };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.orderPlacedAt = {};
      if (filters.dateFrom) {
        query.orderPlacedAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.orderPlacedAt.$lte = filters.dateTo;
      }
    }

    if (filters.storeId) {
      query.storeId = filters.storeId;
    }

    if (filters.orderId) {
      query.orderId = filters.orderId;
    }

    // Build sort object
    const sortObj: QueryOptions["sort"] = {
      [sort.field]: sort.order === "asc" ? 1 : -1,
    };

    // Get total count
    const total = await FundRelease.countDocuments(query);

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.pageSize;
    const totalPages = Math.ceil(total / pagination.pageSize);

    // Execute query with pagination and sorting
    const data = await FundRelease.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(pagination.pageSize)
      .lean<IFundRelease[]>()
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
   * Get admin dashboard statistics
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    const FundRelease = await getFundReleaseModel();

    const stats = await FundRelease.aggregate([
      {
        $facet: {
          statusCounts: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          totalAmount: [
            {
              $group: {
                _id: null,
                total: { $sum: "$settlement.amount" },
              },
            },
          ],
          highRisk: [
            {
              $match: {
                "riskIndicators.isHighRiskStore": true,
              },
            },
            {
              $count: "count",
            },
          ],
        },
      },
    ]);

    if (!stats[0]) {
      return {
        totalPending: 0,
        totalReady: 0,
        totalReleased: 0,
        totalFailed: 0,
        totalAmount: 0,
        highRiskCount: 0,
      };
    }

    const statusMap = stats[0].statusCounts.reduce(
      (acc: Record<string, number>, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    return {
      totalPending: statusMap["pending"] || 0,
      totalReady: statusMap["ready"] || 0,
      totalReleased: statusMap["released"] || 0,
      totalFailed: statusMap["failed"] || 0,
      totalAmount: stats[0].totalAmount[0]?.total || 0,
      highRiskCount: stats[0].highRisk[0]?.count || 0,
    };
  }

  /**
   * Get a single fund release with order + store + subOrder
   */
  static async getFundReleaseById(id: string) {
    const FundRelease = await getFundReleaseModel();
    const fundRelease = await FundRelease.findById(id)
      .lean<IFundRelease>()
      .exec();

    if (!fundRelease) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Fund release not found",
      });
    }

    const Order = await getOrderModel();
    const Store = await getStoreModel();

    const order = await Order.findById(fundRelease.orderId)
      .lean<IOrder>()
      .exec();

    if (!order) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Associated order for this fund release not found",
      });
    }

    const store = await Store.findById(fundRelease.storeId)
      .lean<IStore>()
      .exec();

    if (!store) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Associated store for this fund release not found",
      });
    }

    const relatedSubOrder = order.subOrders.find(
      (sub) => sub._id.toString() === fundRelease.subOrderId.toString()
    );

    if (!relatedSubOrder) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Associated sub-order for this fund release not found",
      });
    }

    return {
      fundRelease,
      order,
      store,
      relatedSubOrder,
    };
  }

  /**
   * Admin action handler: approve, force-release, reverse, add-notes
   */
  static async adminAction(
    id: string,
    action: "approve" | "force-release" | "reverse" | "add-notes",
    admin: AdminTokenData,
    adminNotes?: string
  ) {
    const FundRelease = await getFundReleaseModel();
    const fundRelease = await FundRelease.findById(id).exec();

    if (!fundRelease) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Fund release not found",
      });
    }

    const previousStatus = fundRelease.status;

    switch (action) {
      case "approve":
        if (fundRelease.status !== FundReleaseStatus.Pending) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot approve a ${fundRelease.status} release`,
          });
        }
        fundRelease.status = FundReleaseStatus.Ready;
        fundRelease.trigger = FundReleaseTrigger.AdminApproved;
        fundRelease.adminNotes = adminNotes || "Admin approved this release";
        break;

      case "force-release":
        if (
          fundRelease.status === FundReleaseStatus.Released ||
          fundRelease.status === FundReleaseStatus.Processing
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot force release a ${fundRelease.status} release`,
          });
        }
        if (fundRelease.status !== FundReleaseStatus.Ready) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot force release a ${fundRelease.status} release. Mark this release as ${FundReleaseStatus.Ready} first, then force release.`,
          });
        }
        const processedRelease = await processFundRelease(
          fundRelease._id.toString()
        );
        if (!processedRelease.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: processedRelease.error || "Failed to process fund release",
          });
        }
        fundRelease.status = FundReleaseStatus.Released;
        fundRelease.trigger = FundReleaseTrigger.AdminForced;
        fundRelease.adminNotes = adminNotes || "Admin forced early release";
        break;

      case "reverse":
        if (fundRelease.status !== FundReleaseStatus.Released) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only reverse releases with status 'released'",
          });
        }
        const reversedRelease = await reverseProcessedFundRelease(
          fundRelease._id.toString()
        );
        if (!reversedRelease.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: reversedRelease.error || "Failed to process fund release",
          });
        }
        fundRelease.status = FundReleaseStatus.Reversed;
        fundRelease.adminNotes = adminNotes || "Admin reversed this release";
        break;

      case "add-notes":
        fundRelease.adminNotes = adminNotes || "";
        break;

      default:
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid admin action",
        });
    }

    await fundRelease.save();

    // -------------------
    // AUDIT LOGGING
    // -------------------
    await AuditLogService.create({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles,
      action: `FUND_RELEASE_${action.toUpperCase()}`,
      module: "Fund Release",
      resourceId: fundRelease._id.toString(),
      resourceType: "FundRelease",
      // request,
      details: {
        action,
        previousStatus,
        newStatus: fundRelease.status,
        adminNotes,
      },
    });
    return fundRelease.toObject();
  }

  /**
   * Validate and normalize pagination parameters
   */
  static validatePagination(
    page?: string | number | null,
    pageSize?: string | number | null
  ): PaginationParams {
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedPageSize = Math.min(
      100,
      Math.max(1, Number(pageSize) || 20)
    );

    return { page: normalizedPage, pageSize: normalizedPageSize };
  }
}

import {
  getAuditLogModel,
  type IAuditLog,
} from "@/lib/db/models/audit-log.model";
import type { Role } from "@/modules/admin/security/roles";
import type { NextRequest } from "next/server";

/**
 * Parameters required to create an audit log entry
 */
export interface CreateAuditLogParams {
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRoles: Role[] | string[];
  action: string;
  module: string;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  request?: NextRequest;
}

/**
 * AuditLogService (OOP)
 *
 * Handles creation and future retrieval of audit logs.
 * Ensures single model instance, strict typing, and reliability.
 */
export class AuditLogService {
  private static AuditLogModel: Awaited<
    ReturnType<typeof getAuditLogModel>
  > | null = null;

  /**
   * Lazy-loads the AuditLog model only once
   */
  private static async getModel() {
    if (!this.AuditLogModel) {
      this.AuditLogModel = await getAuditLogModel();
    }
    return this.AuditLogModel;
  }

  /**
   * Create a new admin audit log entry
   */
  static async create(params: CreateAuditLogParams): Promise<IAuditLog> {
    try {
      const Model = await this.getModel();

      const ip =
        params.request?.headers.get("x-forwarded-for") ??
        params.ipAddress ??
        "Unknown";

      const ua =
        params.request?.headers.get("user-agent") ??
        params.userAgent ??
        "Unknown";

      const auditData = {
        adminId: params.adminId,
        adminName: params.adminName,
        adminEmail: params.adminEmail,
        adminRoles: params.adminRoles,
        action: params.action,
        myModule: params.module,
        resourceId: params.resourceId,
        resourceType: params.resourceType,
        details: params.details || {},
        ipAddress: ip,
        userAgent: ua,
      };

      const entry = await Model.create(auditData);

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AUDIT] Admin=${params.adminEmail} Action=${params.action} Module=${params.module}`,
          params.details || {}
        );
      }

      return entry;
    } catch (err) {
      console.error("AuditLogService.create error:", err);

      console.log(
        `[AUDIT FALLBACK] ${params.adminEmail} performed ${params.action} in ${params.module}`,
        params.details
      );

      throw err;
    }
  }

  /**
   * Example: Get logs by admin ID (optional utility)
   */
  static async getByAdmin(adminId: string) {
    const Model = await this.getModel();
    return Model.find({ adminId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Example: Paginated log fetch (optional)
   */
  static async list(options: {
    page?: number;
    limit?: number;
    adminId?: string;
    action?: string;
    module?: string;
  }) {
    const Model = await this.getModel();
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;

    const query: any = {};

    if (options.adminId) query.adminId = options.adminId;
    if (options.action) query.action = options.action;
    if (options.module) query.myModule = options.module;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Model.countDocuments(query),
    ]);

    return {
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}

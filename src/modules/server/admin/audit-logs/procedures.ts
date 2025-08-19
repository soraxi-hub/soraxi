import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { getAuditLogModel } from "@/lib/db/models/audit-log.model";
import {
  GetAuditLogsOutputSchema,
  GetAuditLogsOutputSchemaForAnId,
} from "@/types/admin-audit-log-types"; // Import the new output schema

export const auditLogRouter = createTRPCRouter({
  /**
   * Get Audit Logs Procedure
   *
   * Retrieves audit logs with filtering and pagination capabilities.
   * Only admins with appropriate permissions can access this endpoint.
   *
   * Features:
   * - Authentication verification
   * - Permission checking
   * - Comprehensive filtering options
   * - Date range filtering
   * - Pagination support
   * - Secure audit trail access
   */
  getAuditLogs: baseProcedure
    .input(
      z.object({
        // Pagination parameters
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),

        // Filter parameters
        adminId: z.string().optional(),
        action: z.string().optional(),
        myModule: z.string().optional(),
        resourceId: z.string().optional(),
        resourceType: z.string().optional(),

        // Date range parameters
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .output(GetAuditLogsOutputSchema) // Apply the Zod output schema here
    .query(async ({ input, ctx }) => {
      try {
        // ==================== Authentication & Authorization ====================
        if (!ctx.admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Check if the requester has VIEW_AUDIT_LOGS permission
        if (!checkAdminPermission(ctx.admin, [PERMISSIONS.VIEW_AUDIT_LOGS])) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view audit logs",
          });
        }

        // Build query
        const query: Record<string, any> = {};
        const AuditLog = await getAuditLogModel();

        // Apply filters if provided
        if (input.adminId) query.adminId = input.adminId;
        if (input.action) query.action = input.action;
        if (input.myModule) query.myModule = input.myModule;
        if (input.resourceId) query.resourceId = input.resourceId;
        if (input.resourceType) query.resourceType = input.resourceType;

        // Date range filter
        if (input.startDate || input.endDate) {
          query.createdAt = {};
          if (input.startDate) query.createdAt.$gte = new Date(input.startDate);
          if (input.endDate) query.createdAt.$lte = new Date(input.endDate);
        }

        // Calculate pagination
        const skip = (input.page - 1) * input.limit;

        // Get total count for pagination
        const totalLogs = await AuditLog.countDocuments(query);
        const totalPages = Math.ceil(totalLogs / input.limit);

        // Fetch audit logs with pagination
        const rawAuditLogs = await AuditLog.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(input.limit)
          .lean(); // Use .lean() to get plain JavaScript objects

        // Manually format the auditLogs to match the Zod schema
        const auditLogs = rawAuditLogs.map((log) => ({
          _id: log._id.toString(),
          adminId: log.adminId.toString(),
          adminName: log.adminName,
          adminEmail: log.adminEmail,
          adminRoles: log.adminRoles,
          action: log.action,
          myModule: log.myModule,
          resourceId: log.resourceId,
          resourceType: log.resourceType,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt.toISOString(), // Convert Date to ISO string
          updatedAt: log.updatedAt.toISOString(), // Convert Date to ISO string
          __v: log.__v,
        }));

        return {
          success: true,
          auditLogs: auditLogs, // Ensure auditLogs matches the Zod schema
          pagination: {
            page: input.page,
            limit: input.limit,
            totalLogs,
            totalPages,
          },
        };
      } catch (error) {
        console.error("Error fetching audit logs:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch audit logs",
        });
      }
    }),

  /**
   * Get Audit Log Detail Procedure
   *
   * Retrieves detailed information about a specific audit log entry.
   * Only admins with appropriate permissions can access this endpoint.
   *
   * Features:
   * - Authentication verification
   * - Permission checking
   * - Detailed audit log retrieval
   * - Secure access control
   */
  getAuditLogDetail: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, "Audit log ID is required"),
      })
    )
    .output(GetAuditLogsOutputSchemaForAnId)
    .query(async ({ input, ctx }) => {
      try {
        // ==================== Authentication & Authorization ====================
        if (!ctx.admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Check if the requester has VIEW_AUDIT_LOGS permission
        if (!checkAdminPermission(ctx.admin, [PERMISSIONS.VIEW_AUDIT_LOGS])) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to view audit logs",
          });
        }

        const AuditLog = await getAuditLogModel();

        // Fetch the specific audit log
        const rawAuditLog = await AuditLog.findById(input.id).lean();

        if (!rawAuditLog) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Audit log not found",
          });
        }

        // Manually format the auditLogs to match the Zod schema
        const auditLog = {
          _id: rawAuditLog._id.toString(),
          adminId: rawAuditLog.adminId.toString(),
          adminName: rawAuditLog.adminName,
          adminEmail: rawAuditLog.adminEmail,
          adminRoles: rawAuditLog.adminRoles,
          action: rawAuditLog.action,
          myModule: rawAuditLog.myModule,
          resourceId: rawAuditLog.resourceId,
          resourceType: rawAuditLog.resourceType,
          details: rawAuditLog.details,
          ipAddress: rawAuditLog.ipAddress,
          userAgent: rawAuditLog.userAgent,
          createdAt: rawAuditLog.createdAt.toISOString(), // Convert Date to ISO string
          updatedAt: rawAuditLog.updatedAt.toISOString(), // Convert Date to ISO string
          __v: rawAuditLog.__v,
        };

        return {
          success: true,
          auditLog,
        };
      } catch (error) {
        console.error("Error fetching audit log:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch audit log",
        });
      }
    }),
});

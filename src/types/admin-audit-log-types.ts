import { z } from "zod";

/**
 * Zod schema for a single Audit Log entry.
 * This schema reflects the structure of an IAuditLog document after it has been
 * retrieved from MongoDB and converted to a plain JavaScript object (e.g., via .lean()).
 */
export const AuditLogSchema = z.object({
  _id: z.string(), // MongoDB ObjectId converted to string
  adminId: z.string(), // MongoDB ObjectId converted to string
  adminName: z.string(),
  adminEmail: z.string(),
  adminRoles: z.array(z.string()), // Array of string roles
  action: z.string(),
  myModule: z.string(),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(), // Details can be any object, so using z.record(z.string(), z.any())
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(), // Date object converted to ISO string
  updatedAt: z.string(), // Date object converted to ISO string
  __v: z.number().optional(), // Mongoose version key
});

/**
 * Zod schema for the pagination metadata.
 */
export const AuditLogPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalLogs: z.number(),
  totalPages: z.number(),
});

/**
 * Zod schema for the complete output of the getAuditLogs procedure.
 */
export const GetAuditLogsOutputSchema = z.object({
  success: z.boolean(),
  auditLogs: z.array(AuditLogSchema),
  pagination: AuditLogPaginationSchema,
});

/**
 * Zod schema for the complete output of the getAuditLogs procedure.
 */
export const GetAuditLogsOutputSchemaForAnId = z.object({
  success: z.boolean(),
  auditLog: AuditLogSchema,
});

/**
 * TypeScript type inference from the Zod schema for a single Audit Log.
 */
export type AuditLog = z.infer<typeof AuditLogSchema>;

/**
 * TypeScript type inference from the Zod schema for the getAuditLogs procedure's output.
 */
export type GetAuditLogsOutput = z.infer<typeof GetAuditLogsOutputSchema>;

/**
 * TypeScript type inference from the Zod schema for the getAuditLogs procedure's output for a particular Admin Id.
 */
export type GetAuditLogsOutputForAnId = z.infer<
  typeof GetAuditLogsOutputSchemaForAnId
>;

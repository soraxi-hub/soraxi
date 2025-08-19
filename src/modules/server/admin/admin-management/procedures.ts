import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import {
  getAdminById,
  getAdminModel,
  getAllAdmins,
} from "@/lib/db/models/admin.model";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  logAdminAction,
} from "@/modules/admin/security/audit-logger";
const bcryptjs = await import("bcryptjs");

export const adminManagementRouter = createTRPCRouter({
  /**
   * Get All Admins Procedure
   *
   * Fetches all admin users from the database with proper permissions checking.
   * Only admins with 'manage_admins' permission can access this endpoint.
   *
   * Features:
   * - Authentication verification
   * - Permission checking
   * - Secure field exclusion (passwords)
   * - Audit logging
   */
  listAdmins: baseProcedure.query(async ({ ctx }) => {
    const { admin } = ctx;
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to release escrow funds. This is a critical
     * security check as escrow release involves financial transactions.
     */
    if (!admin || !checkAdminPermission(admin, [PERMISSIONS.MANAGE_ADMINS])) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to manage admins",
      });
    }

    const admins = await getAllAdmins(true);

    if (!admins) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Admins not found",
      });
    }

    const formattedAdmins = admins.map((admin) => ({
      _id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      roles: admin.roles,
      isActive: admin.isActive,
      lastLogin: admin.updatedAt,
    }));

    return { success: true, admins: formattedAdmins };
  }),

  /**
   * Create Admin Procedure
   *
   * Creates a new admin user with proper validation and permissions checking.
   * Only admins with 'manage_admins' permission can access this endpoint.
   *
   * Features:
   * - Input validation
   * - Email uniqueness check
   * - Password hashing
   * - Permission checking
   * - Audit logging
   */
  createAdmin: baseProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Invalid email format"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        roles: z.array(z.string()).min(1, "At least one role is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { admin } = ctx;
      try {
        // ==================== Authentication & Authorization ====================
        if (!admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Check if the requester has MANAGE_ADMINS permission
        if (!checkAdminPermission(admin, [PERMISSIONS.MANAGE_ADMINS])) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create admin users",
          });
        }

        const Admin = await getAdminModel();

        // Check if admin with this email already exists
        const existingAdmin = await Admin.findOne({ email: input.email });
        if (existingAdmin) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Admin with this email already exists",
          });
        }

        // Hash the password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(input.password, salt);

        // Create new admin
        const newAdmin = new Admin({
          name: input.name,
          email: input.email,
          password: hashedPassword,
          roles: input.roles,
          isActive: true,
        });

        await newAdmin.save();

        const params = {
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: AUDIT_ACTIONS.ADMIN_CREATED,
          module: AUDIT_MODULES.ADMIN,
          resourceId: newAdmin._id.toString(),
          resourceType: AUDIT_MODULES.ADMIN,
          details: {
            name: input.name,
            email: input.email,
            roles: input.roles,
          },
        };

        // Log this action
        await logAdminAction(params);

        return {
          success: true,
          message: "Admin created successfully",
          admin: {
            id: newAdmin._id,
            name: newAdmin.name,
            email: newAdmin.email,
            roles: newAdmin.roles,
          },
        };
      } catch (error) {
        console.error("Error creating admin:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create admin user",
        });
      }
    }),

  /**
   * Update Admin Procedure
   *
   * Updates an existing admin user with proper validation and permissions checking.
   * Only admins with 'manage_admins' permission can access this endpoint.
   *
   * Features:
   * - Input validation
   * - Prevents deactivating last super admin
   * - Password hashing if updated
   * - Change tracking for audit logs
   * - Permission checking
   * - Audit logging
   */
  updateAdmin: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, "Admin ID is required"),
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Invalid email format").optional(),
        roles: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { admin: adminToken } = ctx;
      try {
        // ==================== Authentication & Authorization ====================
        if (!adminToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Check if the requester has MANAGE_ADMINS permission
        if (!checkAdminPermission(adminToken, [PERMISSIONS.MANAGE_ADMINS])) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create admin users",
          });
        }

        const Admin = await getAdminModel();

        // Find the admin to update
        const admin = await getAdminById(input.id);
        if (!admin) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin not found",
          });
        }

        // Prevent deactivating the last super_admin
        if (admin.roles.includes("super_admin") && input.isActive === false) {
          const superAdminCount = await Admin.countDocuments({
            roles: "super_admin",
            isActive: true,
            _id: { $ne: input.id },
          });

          if (superAdminCount === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot deactivate the last super admin",
            });
          }
        }

        // Track changes for audit log
        const changes: Record<string, { before: any; after: any }> = {};

        // Update admin fields if provided
        if (input.name && input.name !== admin.name) {
          changes.name = { before: admin.name, after: input.name };
          admin.name = input.name;
        }

        if (input.email && input.email !== admin.email) {
          changes.email = { before: admin.email, after: input.email };
          admin.email = input.email;
        }

        if (input.roles) {
          const rolesChanged =
            JSON.stringify(input.roles) !== JSON.stringify(admin.roles);
          if (rolesChanged) {
            changes.roles = { before: admin.roles, after: input.roles };
            admin.roles = input.roles;
          }
        }

        if (
          typeof input.isActive === "boolean" &&
          input.isActive !== admin.isActive
        ) {
          changes.isActive = { before: admin.isActive, after: input.isActive };
          admin.isActive = input.isActive;
        }

        // Update password if provided
        if (input.password) {
          changes.password = { before: "********", after: "********" };
          const salt = await bcryptjs.genSalt(10);
          admin.password = await bcryptjs.hash(input.password, salt);
        }

        await admin.save();

        const params = {
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: AUDIT_ACTIONS.ADMIN_UPDATED,
          module: AUDIT_MODULES.ADMIN,
          resourceId: input.id.toString(),
          resourceType: AUDIT_MODULES.ADMIN,
          details: {
            name: input.name,
            email: input.email,
            roles: input.roles,
          },
        };

        // Log this action
        await logAdminAction(params);

        return {
          success: true,
          message: "Admin updated successfully",
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            roles: admin.roles,
            isActive: admin.isActive,
          },
        };
      } catch (error) {
        console.error("Error updating admin:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update admin user",
        });
      }
    }),

  /**
   * Delete Admin Procedure
   *
   * Deletes an admin user with proper validation and permissions checking.
   * Only admins with 'manage_admins' permission can access this endpoint.
   *
   * Features:
   * - Prevents deleting last super admin
   * - Permission checking
   * - Audit logging with deleted admin details
   * - Comprehensive error handling
   */
  deleteAdmin: baseProcedure
    .input(
      z.object({
        id: z.string().min(1, "Admin ID is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { admin: adminToken } = ctx;
      try {
        // ==================== Authentication & Authorization ====================
        if (!adminToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Authentication required",
          });
        }

        // Check if the requester has MANAGE_ADMINS permission
        if (!checkAdminPermission(adminToken, [PERMISSIONS.MANAGE_ADMINS])) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to create admin users",
          });
        }

        const Admin = await getAdminModel();

        // Find the admin to delete
        const admin = await getAdminById(input.id);
        if (!admin) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Admin not found",
          });
        }

        // Prevent deleting the last super_admin
        if (admin.roles.includes("super_admin")) {
          const superAdminCount = await Admin.countDocuments({
            roles: "super_admin",
            _id: { $ne: input.id },
          });

          if (superAdminCount === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot delete the last super admin",
            });
          }
        }

        // Store admin data for audit log
        const adminData = {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          roles: admin.roles,
        };

        // Delete the admin
        await Admin.findByIdAndDelete(input.id);

        const params = {
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: AUDIT_ACTIONS.ADMIN_DELETED,
          module: AUDIT_MODULES.ADMIN,
          resourceId: input.id.toString(),
          resourceType: AUDIT_MODULES.ADMIN,
          details: {
            deletedAdmin: adminData,
          },
        };

        // Log this action
        await logAdminAction(params);

        return {
          success: true,
          message: "Admin deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting admin:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete admin user",
        });
      }
    }),
});

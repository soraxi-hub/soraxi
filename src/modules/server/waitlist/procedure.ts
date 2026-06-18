import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { VendorApplicationRepository } from "@/repositories/vendor-application-repository";
import { WaitlistService } from "@/services/waitlist-service";

const vendorApplicationRepository = new VendorApplicationRepository();
const waitlistService = new WaitlistService(vendorApplicationRepository);

// ─── Input schemas ────────────────────────────────────────────────────────────
const checkStatusSchema = z.object({
  email: z.string().email(),
  referenceId: z.string().min(1),
});

const approveSchema = z.object({
  applicationId: z.string().min(1),
});

const rejectSchema = z.object({
  applicationId: z.string().min(1),
  reason: z
    .string()
    .min(10, "Please provide a meaningful rejection reason")
    .max(500),
});

const getPendingSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(20),
});

export const waitlistRouter = createTRPCRouter({
  /**
   * Public — vendor checks their application status using email + referenceId.
   */
  checkStatus: baseProcedure
    .input(checkStatusSchema)
    .query(async ({ input }) => {
      try {
        return await waitlistService.checkStatus(
          input.email,
          input.referenceId,
        );
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: error.message,
          });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Admin — fetch paginated pending applications with category saturation counts.
   */
  getPendingApplications: baseProcedure
    .input(getPendingSchema)
    .query(async ({ input }) => {
      try {
        return await waitlistService.getPendingApplications(
          input.page,
          input.limit,
        );
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getApplicationById: baseProcedure
    .input(
      z.object({
        applicationId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { applicationId } = input;
        return await waitlistService.getPendingApplicationById(applicationId);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Admin — approve an application. Generates invite token and triggers email.
   */
  approveApplication: baseProcedure
    .input(approveSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Login to perform any action",
          });
        }

        await waitlistService.approveApplication(
          input.applicationId,
          ctx.admin.id,
        );
        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Admin — reject an application with a reason that gets sent to the vendor.
   */
  rejectApplication: baseProcedure
    .input(rejectSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Login to perform any action",
          });
        }
        await waitlistService.rejectApplication(
          input.applicationId,
          ctx.admin.id,
          input.reason,
        );
        return { success: true };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});

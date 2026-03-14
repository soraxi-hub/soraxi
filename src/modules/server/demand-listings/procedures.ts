import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { TRPCError } from "@trpc/server";
import { RequestService } from "@/services/request.service";

/**
 * tRPC Router: requestRouter
 * Handles all "Looking For" / demand listing operations.
 */
export const requestRouter = createTRPCRouter({
  /**
   * Procedure: createRequest
   * Allows a user to create a new demand listing.
   */
  createRequest: baseProcedure
    .input(
      z.object({
        title: z.string().min(3, "Title is required").max(120),
        description: z.string().max(1000).optional(),
        category: z.array(z.string()).optional(),
        budgetMin: z.number().optional(),
        budgetMax: z.number().optional(),
        images: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
            cause: "UserNotAuthenticated",
          });
        }

        const requestService = await RequestService.init();

        const request = await requestService.createRequest({
          ...input,
          userId: user.id,
        });

        return {
          success: true,
          request,
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to create request");
      }
    }),

  /**
   * Procedure: getAllRequests
   * Fetches all active requests for the marketplace feed.
   */
  getAllRequests: baseProcedure
    .input(
      z
        .object({
          page: z.number().default(1),
          limit: z.number().default(20),
          category: z.array(z.string()).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      try {
        const requestService = await RequestService.init();

        const requests = await requestService.getAllRequests(input);

        return {
          success: true,
          ...requests,
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to fetch requests");
      }
    }),

  /**
   * Procedure: getRequestById
   * Fetches a single request by ID.
   */
  getRequestById: baseProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        const requestService = await RequestService.init();

        const request = await requestService.getRequestById(input.requestId);

        if (!request) {
          return {
            success: false,
            reason: "REQUEST_NOT_FOUND",
            request: null,
          };
        }

        return {
          success: true,
          request,
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to fetch request");
      }
    }),

  /**
   * Procedure: getUserRequests
   * Fetches all requests created by the logged-in user.
   */
  getUserRequests: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user || !user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
          cause: "UserNotAuthenticated",
        });
      }

      const requestService = await RequestService.init();

      const requests = await requestService.getUserRequests(user.id);

      return {
        success: true,
        requests,
      };
    } catch (err) {
      throw handleTRPCError(err, "Failed to fetch user requests");
    }
  }),

  /**
   * Procedure: updateRequest
   * Allows a user to edit their request.
   */
  updateRequest: baseProcedure
    .input(
      z.object({
        requestId: z.string(),
        title: z.string().min(3).max(120).optional(),
        description: z.string().max(1000).optional(),
        category: z.array(z.string()).optional(),
        budgetMin: z.number().optional(),
        budgetMax: z.number().optional(),
        images: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
          });
        }

        const requestService = await RequestService.init();

        const request = await requestService.updateRequest({
          ...input,
          userId: user.id,
        });

        return {
          success: true,
          request,
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to update request");
      }
    }),

  /**
   * Procedure: deleteRequest
   * Allows a user to delete their request.
   */
  deleteRequest: baseProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
          });
        }

        const requestService = await RequestService.init();

        await requestService.deleteRequest({
          requestId: input.requestId,
          userId: user.id,
        });

        return {
          success: true,
          message: "Request deleted successfully",
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to delete request");
      }
    }),

  /**
   * Procedure: markRequestFulfilled
   * Allows a user to mark their request as fulfilled.
   */
  markRequestFulfilled: baseProcedure
    .input(
      z.object({
        requestId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
          });
        }

        const requestService = await RequestService.init();

        const request = await requestService.markRequestFulfilled({
          requestId: input.requestId,
          userId: user.id,
        });

        return {
          success: true,
          request,
        };
      } catch (err) {
        throw handleTRPCError(err, "Failed to update request status");
      }
    }),
});

import { z } from "zod";

import { DeliveryProofMethodEnum, DeliveryStatus } from "@/enums";
import { AppError } from "@/lib/errors/app-error";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { formatOrderNumber } from "@/lib/utils/order-number";
import { checkRateLimit } from "@/lib/utils/rate-limiter";
import {
  DELIVERY_CODE_LENGTH,
  MAX_DELIVERY_CODE_ATTEMPTS,
} from "@/lib/utils/delivery-proof";
import { DeliveryProofService } from "@/services/orders/delivery-proof.service";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

/**
 * Public delivery-confirmation endpoints, used by the rider link at `/d/[token]`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS ROUTER IS UNAUTHENTICATED, DELIBERATELY
 * ─────────────────────────────────────────────────────────────────────────────
 * The person confirming a delivery is typically a rider the vendor hired for
 * the afternoon. Requiring an account would mean either the vendor reading
 * codes down the phone for every drop, or building a rider identity system
 * nobody asked for.
 *
 * The token in the URL is the only credential, and it is a weak one on purpose:
 * it grants the ability to *attempt* a confirmation, never to complete one,
 * because the customer's 6-digit code is still required. Treat everything this
 * router returns as public.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT MUST NEVER LEAVE HERE
 * ─────────────────────────────────────────────────────────────────────────────
 * The delivery code, the customer's address, phone number, email, surname, the
 * order value, or anything about other sub-orders. Anyone the link is forwarded
 * to sees this payload.
 */

/** Distinguishes the seven states the rider page renders. */
export type DeliveryLinkState =
  | "ready"
  | "locked"
  | "already_confirmed"
  | "invalid";

const tokenInput = z.object({ token: z.string().min(1).max(128) });

const submitInput = z.object({
  token: z.string().min(1).max(128),
  riderName: z.string().trim().min(2).max(60),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${DELIVERY_CODE_LENGTH}}$`), "Enter all 6 digits"),
});

export const deliveryConfirmationRouter = createTRPCRouter({
  /**
   * Resolves a delivery link into the minimum needed to render the page.
   *
   * Unknown, expired and retired tokens all return the same `invalid` state.
   * Distinguishing them would hand anyone probing links a free oracle.
   */
  getByToken: baseProcedure.input(tokenInput).query(async ({ input }) => {
    try {
      const resolved = await DeliveryProofService.resolveToken(input.token);

      if (!resolved) {
        // `state` is a literal in every branch, not a widened union type, so
        // the client can narrow on it and reach the branch-specific fields.
        return { state: "invalid" as const };
      }

      const { order, subOrder } = resolved;
      const proof = subOrder.deliveryProof;

      const base = {
        orderNumber: formatOrderNumber(
          subOrder._id.toString(),
          order.createdAt,
        ),
        itemCount: subOrder.products.length,
        storeName: subOrder.storeSnapshot?.name ?? "",
        // First name only. A rider needs enough to know they are at the right
        // door, and nothing more.
        customerFirstName: (order.userSnapshot?.name ?? "").split(/\s+/)[0] ?? "",
      };

      if (subOrder.deliveryStatus === DeliveryStatus.Delivered) {
        return {
          ...base,
          state: "already_confirmed" as const,
          confirmedAt: proof?.confirmedAt?.toISOString(),
          confirmedBy:
            proof?.method === DeliveryProofMethodEnum.CustomerInApp
              ? `${base.customerFirstName} (in app)`
              : (proof?.riderName ?? "the vendor"),
        };
      }

      if (proof?.lockedAt) {
        return { ...base, state: "locked" as const };
      }

      return {
        ...base,
        state: "ready" as const,
        attemptsLeft: Math.max(
          0,
          MAX_DELIVERY_CODE_ATTEMPTS - (proof?.attempts ?? 0),
        ),
      };
    } catch (error) {
      throw handleTRPCError(error, "Could not load this delivery link");
    }
  }),

  /**
   * Verifies the code and, on success, marks the sub-order delivered and
   * releases the vendor's funds immediately.
   *
   * Rate limited by token on top of the per-sub-order attempt counter. The
   * counter is the real defence; this simply stops a script burning three
   * attempts across thousands of tokens in a second.
   */
  submitCode: baseProcedure.input(submitInput).mutation(async ({ input }) => {
    try {
      const limit = await checkRateLimit(
        `delivery:submit:${input.token}`,
        10,
        60 * 1000,
      );

      if (!limit.allowed) {
        throw new AppError(
          "TOO_MANY_REQUESTS",
          `Too many attempts. Try again in ${limit.retryAfter}s.`,
        );
      }

      const resolved = await DeliveryProofService.resolveToken(input.token);

      if (!resolved) {
        throw new AppError("NOT_FOUND", "This link is no longer valid.");
      }

      const { order, subOrder } = resolved;

      const result = await DeliveryProofService.confirmWithCode({
        orderId: order._id.toString(),
        subOrderId: subOrder._id.toString(),
        code: input.code,
        riderName: input.riderName,
        method: DeliveryProofMethodEnum.CodeByRider,
      });

      return {
        success: true as const,
        orderNumber: formatOrderNumber(
          subOrder._id.toString(),
          order.createdAt,
        ),
        confirmedAt: result.confirmedAt.toISOString(),
        riderName: result.riderName,
      };
    } catch (error) {
      throw handleTRPCError(error, "Could not confirm this delivery");
    }
  }),
});

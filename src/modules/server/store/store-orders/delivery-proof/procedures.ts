import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { DeliveryProofMethodEnum, DeliveryStatus } from "@/enums";
import { DELIVERY_CODE_LENGTH } from "@/constants/delivery";
import { getOrderModel } from "@/lib/db/models/order.model";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { buildDeliveryLink } from "@/lib/utils/delivery-proof";
import { DeliveryProofService } from "@/services/orders/delivery-proof.service";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

/**
 * Vendor-side proof-of-delivery actions.
 *
 * Every procedure re-derives the sub-order from the **authenticated store**,
 * never from a client-supplied storeId, so a vendor cannot act on another
 * store's orders by changing a parameter.
 *
 * ⚠️ Nothing here may return the customer's delivery code. A vendor able to
 * read it could confirm their own deliveries and be paid for goods never handed
 * over — the single failure that would make this whole feature pointless. The
 * projections in `domain/orders/delivery-proof-projection.ts` enforce it; this
 * comment exists so nobody "helpfully" adds it back.
 */

const subOrderInput = z.object({
  orderId: z.string(),
  subOrderId: z.string(),
});

/**
 * Resolves a sub-order that belongs to the calling store.
 *
 * The store check is the authorisation boundary for this router.
 */
async function loadOwnSubOrder(
  orderId: string,
  subOrderId: string,
  storeId: string,
) {
  const Order = await getOrderModel();
  const order = await Order.findById(orderId);

  if (!order) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
  }

  const subOrder = order.subOrders.find(
    (s) => s._id.toString() === subOrderId,
  );

  if (!subOrder) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Sub-order not found" });
  }

  if (subOrder.storeId.toString() !== storeId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This sub-order does not belong to your store",
    });
  }

  return { order, subOrder };
}

function requireStore(ctx: { store: { id: string } | null }) {
  if (!ctx.store) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Store authentication required",
    });
  }
  return ctx.store;
}

export const deliveryProofRouter = createTRPCRouter({
  /**
   * Issues a fresh delivery link, invalidating the previous one.
   *
   * The answer to "the rider lost the link" and to a link reaching the wrong
   * person. Also clears the attempt counter, so a lockout caused by one rider
   * does not follow the vendor to the next.
   */
  regenerateLink: baseProcedure
    .input(subOrderInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);
        const { order, subOrder } = await loadOwnSubOrder(
          input.orderId,
          input.subOrderId,
          store.id,
        );

        if (subOrder.deliveryStatus === DeliveryStatus.Delivered) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This delivery is already confirmed.",
          });
        }

        const token = DeliveryProofService.reissueToken(subOrder);
        await order.save();

        return { link: buildDeliveryLink(token) };
      } catch (error) {
        throw handleTRPCError(error, "Could not regenerate the delivery link");
      }
    }),

  /**
   * Confirms delivery using a code the vendor read from the rider over the
   * phone.
   *
   * For riders with no smartphone or no data. Still buyer-attested — the
   * customer released the code — so it earns the same immediate payout as the
   * link path. Only the keyboard differs, which is why the recorded method
   * distinguishes them for an admin without treating one as weaker.
   */
  confirmWithCode: baseProcedure
    .input(
      subOrderInput.extend({
        code: z
          .string()
          .trim()
          .regex(
            new RegExp(`^\\d{${DELIVERY_CODE_LENGTH}}$`),
            `Enter all ${DELIVERY_CODE_LENGTH} digits`,
          ),
        riderName: z.string().trim().min(2).max(60),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);
        await loadOwnSubOrder(input.orderId, input.subOrderId, store.id);

        const result = await DeliveryProofService.confirmWithCode({
          orderId: input.orderId,
          subOrderId: input.subOrderId,
          code: input.code,
          riderName: input.riderName,
          method: DeliveryProofMethodEnum.CodeByVendor,
        });

        return {
          success: true as const,
          confirmedAt: result.confirmedAt.toISOString(),
          riderName: result.riderName,
        };
      } catch (error) {
        throw handleTRPCError(error, "Could not confirm this delivery");
      }
    }),

  /**
   * Marks a sub-order delivered with no proof at all.
   *
   * Deliberately kept available: riders lose phones and customers refuse codes,
   * and a vendor who genuinely delivered must not be stranded. It simply earns
   * no immediate payout — escrow keeps its normal timer — and the admin dispute
   * panel will show that nothing corroborates the claim.
   */
  declareWithoutProof: baseProcedure
    .input(subOrderInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);
        await loadOwnSubOrder(input.orderId, input.subOrderId, store.id);

        await DeliveryProofService.declareWithoutProof({
          orderId: input.orderId,
          subOrderId: input.subOrderId,
        });

        return { success: true as const };
      } catch (error) {
        throw handleTRPCError(error, "Could not update this delivery");
      }
    }),
});

import "server-only";
import mongoose from "mongoose";

import {
  DeliveryProofMethodEnum,
  DeliveryStatus,
  StatusHistory,
} from "@/enums";
import {
  getOrderModel,
  type IOrderDocument,
  type ISubOrder,
} from "@/lib/db/models/order.model";
import { AppError } from "@/lib/errors/app-error";
import {
  DELIVERY_TOKEN_TTL_MS,
  MAX_DELIVERY_CODE_ATTEMPTS,
  generateDeliveryCode,
  generateDeliveryToken,
  verifyDeliveryCode,
} from "@/lib/utils/delivery-proof";
import { settleSuborder } from "./suborder-settlement.service";
import { MessagingEvents } from "@/services/messaging/messaging-events";

/**
 * Proof of delivery — issuing codes and links, and confirming against them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PROBLEM THIS SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 * A vendor used to mark a sub-order delivered on nothing but their own say-so,
 * and three days later the money left escrow. A customer disputing non-delivery
 * had no way to prove a negative, and the vendor was never asked to prove the
 * positive.
 *
 * A 6-digit code held by the customer fixes the asymmetry. Entering it is
 * evidence the buyer was present and released it. It defeats fraud in both
 * directions at once: a vendor cannot fabricate delivery, and a customer cannot
 * take the goods and then claim they never arrived.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TIMING
 * ─────────────────────────────────────────────────────────────────────────────
 * Both the code and the link are minted on the transition to **Shipped**.
 *
 * That is the earliest point `Delivered` becomes reachable — the state machine
 * allows `Shipped → Delivered` directly, skipping `OutForDelivery` — so minting
 * any later would leave a legal route to delivery with no code in existence.
 * It also matches the customer's Processing card, which reads "your delivery
 * code appears here once it's on the way".
 */
export class DeliveryProofService {
  // ---------------------------------------------------------------------------
  // ISSUING
  // ---------------------------------------------------------------------------

  /**
   * Mints the delivery code and link for a sub-order that has just shipped.
   *
   * Idempotent on the code: a sub-order that already has one keeps it, so a
   * vendor bouncing between statuses never invalidates a code the customer has
   * already been shown. The link is always refreshed, since its clock starts at
   * despatch.
   *
   * Mutates the sub-order in place; the caller saves.
   */
  static issueForShipment(subOrder: ISubOrder): {
    code: string;
    token: string;
  } {
    const now = new Date();
    const existing = subOrder.deliveryProof;

    const code = existing?.code ?? generateDeliveryCode();
    const token = generateDeliveryToken();

    subOrder.deliveryProof = {
      ...(existing ?? { attempts: 0 }),
      code,
      codeGeneratedAt: existing?.codeGeneratedAt ?? now,
      token,
      tokenCreatedAt: now,
      tokenExpiresAt: new Date(now.getTime() + DELIVERY_TOKEN_TTL_MS),
      attempts: existing?.attempts ?? 0,
    };

    return { code, token };
  }

  /**
   * Issues a fresh link for a sub-order, replacing any existing one.
   *
   * The supported answer to "the rider lost the link" and to a link having
   * reached the wrong person — the previous token stops working the moment this
   * returns, because only one is stored.
   *
   * Regeneration also **clears the attempt counter**. A vendor switching to a
   * different rider should not inherit a lockout caused by the last one, and
   * this does not meaningfully widen the guessing window: an attacker would
   * have to persuade the vendor to reissue between every three guesses.
   */
  static reissueToken(subOrder: ISubOrder): string {
    const token = generateDeliveryToken();
    const now = new Date();

    subOrder.deliveryProof = {
      ...(subOrder.deliveryProof ?? { attempts: 0 }),
      token,
      tokenCreatedAt: now,
      tokenExpiresAt: new Date(now.getTime() + DELIVERY_TOKEN_TTL_MS),
      attempts: 0,
      lockedAt: undefined,
    };

    return token;
  }

  // ---------------------------------------------------------------------------
  // RESOLVING A LINK
  // ---------------------------------------------------------------------------

  /**
   * Resolves a link token to its order and sub-order.
   *
   * Returns `null` for unknown *and* expired tokens alike — the caller must not
   * be able to tell them apart, since distinguishing "expired" from "never
   * existed" hands an attacker a free oracle for probing links.
   */
  static async resolveToken(token: string): Promise<{
    order: IOrderDocument;
    subOrder: ISubOrder;
  } | null> {
    const Order = await getOrderModel();

    const order = await Order.findOne({
      "subOrders.deliveryProof.token": token,
    });

    if (!order) return null;

    const subOrder = order.subOrders.find(
      (s) => s.deliveryProof?.token === token,
    );

    if (!subOrder) return null;

    const expiresAt = subOrder.deliveryProof?.tokenExpiresAt;
    if (expiresAt && expiresAt.getTime() < Date.now()) return null;

    return { order, subOrder };
  }

  // ---------------------------------------------------------------------------
  // CONFIRMING
  // ---------------------------------------------------------------------------

  /**
   * Verifies a supplied code and, on success, marks the sub-order delivered and
   * releases escrow.
   *
   * The whole operation is transactional. Marking delivered without releasing
   * funds, or releasing funds without recording proof, would each be worse than
   * failing outright.
   *
   * @param method - Distinguishes a rider typing on the public link from a
   *   vendor entering a code read to them over the phone. Both are
   *   buyer-attested and both release funds immediately; the distinction is
   *   preserved because an admin resolving a dispute may want it.
   */
  static async confirmWithCode({
    orderId,
    subOrderId,
    code,
    riderName,
    method,
  }: {
    orderId: string;
    subOrderId: string;
    code: string;
    riderName: string;
    method:
      | DeliveryProofMethodEnum.CodeByRider
      | DeliveryProofMethodEnum.CodeByVendor;
  }): Promise<{ confirmedAt: Date; riderName: string }> {
    const Order = await getOrderModel();
    const session = await mongoose.startSession();
    session.startTransaction();

    let confirmedAt: Date;

    try {
      // Re-read inside the transaction. The caller resolved this sub-order to
      // render a page; between then and now the customer may have confirmed in
      // their own app, or another rider may have used a second link.
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new AppError("NOT_FOUND", "Order not found");

      const subOrder = order.subOrders.find(
        (s) => s._id.toString() === subOrderId,
      );
      if (!subOrder) throw new AppError("NOT_FOUND", "Sub-order not found");

      const proof = subOrder.deliveryProof;

      if (proof?.lockedAt) {
        throw new AppError(
          "FORBIDDEN",
          "Too many attempts. Ask the vendor to confirm this delivery another way.",
        );
      }

      if (subOrder.deliveryStatus === DeliveryStatus.Delivered) {
        throw new AppError(
          "CONFLICT",
          "This delivery has already been confirmed.",
        );
      }

      if (!verifyDeliveryCode(code, proof?.code)) {
        // Persist the failed attempt outside this transaction — an aborted
        // transaction would roll the counter back and hand an attacker
        // unlimited guesses.
        await session.abortTransaction();

        const remaining = await this.recordFailedAttempt(orderId, subOrderId);

        throw new AppError(
          "BAD_REQUEST",
          remaining > 0
            ? `That code doesn't match. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
            : "Too many attempts. Ask the vendor to confirm this delivery another way.",
        );
      }

      confirmedAt = new Date();

      subOrder.deliveryStatus = DeliveryStatus.Delivered;
      subOrder.deliveryDate = confirmedAt;
      subOrder.statusHistory.push({
        status: StatusHistory.Delivered,
        timestamp: confirmedAt,
        notes: `Delivery confirmed with the customer's code by ${riderName}.`,
      });

      subOrder.deliveryProof = {
        ...proof!,
        method,
        confirmedAt,
        riderName,
      };

      // A code entered by the recipient *is* the customer confirming receipt,
      // so the existing confirmation flag is set too. `autoConfirmed` stays
      // false: nothing about this was automatic.
      subOrder.customerConfirmedDelivery = {
        confirmed: true,
        confirmedAt,
        autoConfirmed: false,
      };

      // The promised benefit: proof earns an immediate payout rather than the
      // three-day wait.
      await settleSuborder({
        orderId,
        subOrderId,
        trigger: "DELIVERY_CODE",
        session,
      });

      await order.save({ session });
      await session.commitTransaction();
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      await session.endSession();
    }

    // Announced after the transaction commits, never inside it. Publishing is
    // fire-and-forget and never throws, so a messaging hiccup cannot fail a
    // delivery that has already been confirmed and paid out.
    await MessagingEvents.deliveryConfirmed({ subOrderId, riderName });

    return { confirmedAt, riderName };
  }

  /**
   * Records a wrong-code attempt and locks the link once they are exhausted.
   *
   * Deliberately its own atomic update, outside any transaction: the counter
   * must survive the rollback of the confirmation attempt that produced it.
   *
   * @returns attempts remaining
   */
  private static async recordFailedAttempt(
    orderId: string,
    subOrderId: string,
  ): Promise<number> {
    const Order = await getOrderModel();

    const updated = await Order.findOneAndUpdate(
      { _id: orderId, "subOrders._id": subOrderId },
      { $inc: { "subOrders.$.deliveryProof.attempts": 1 } },
      { new: true },
    );

    const subOrder = updated?.subOrders.find(
      (s) => s._id.toString() === subOrderId,
    );

    const attempts = subOrder?.deliveryProof?.attempts ?? 0;
    const remaining = Math.max(0, MAX_DELIVERY_CODE_ATTEMPTS - attempts);

    if (remaining === 0 && subOrder && !subOrder.deliveryProof?.lockedAt) {
      await Order.updateOne(
        { _id: orderId, "subOrders._id": subOrderId },
        { $set: { "subOrders.$.deliveryProof.lockedAt": new Date() } },
      );
    }

    return remaining;
  }

  /**
   * Marks a sub-order delivered with no proof at all.
   *
   * Kept as a supported path — riders lose phones, customers refuse codes, and
   * a vendor who genuinely delivered must not be stranded. But it earns no
   * immediate payout: funds stay in escrow for the normal waiting period, and
   * the admin dispute panel will show that nothing corroborates the claim.
   */
  static async declareWithoutProof({
    orderId,
    subOrderId,
    note,
  }: {
    orderId: string;
    subOrderId: string;
    note?: string;
  }): Promise<void> {
    const Order = await getOrderModel();
    const order = await Order.findById(orderId);

    if (!order) throw new AppError("NOT_FOUND", "Order not found");

    const subOrder = order.subOrders.find(
      (s) => s._id.toString() === subOrderId,
    );
    if (!subOrder) throw new AppError("NOT_FOUND", "Sub-order not found");

    if (subOrder.deliveryStatus === DeliveryStatus.Delivered) {
      throw new AppError("CONFLICT", "This sub-order is already delivered.");
    }

    const now = new Date();

    subOrder.deliveryStatus = DeliveryStatus.Delivered;
    subOrder.deliveryDate = now;
    subOrder.statusHistory.push({
      status: StatusHistory.Delivered,
      timestamp: now,
      notes: note ?? "Marked delivered by the vendor without a delivery code.",
    });

    subOrder.deliveryProof = {
      ...(subOrder.deliveryProof ?? { attempts: 0 }),
      method: DeliveryProofMethodEnum.VendorDeclared,
      confirmedAt: now,
    };

    // Note what is *not* here: no settlement. Escrow keeps its normal timer,
    // which is the entire difference between this path and a code confirmation.
    await order.save();
  }
}

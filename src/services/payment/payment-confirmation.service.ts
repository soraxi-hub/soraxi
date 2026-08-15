import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import { PaymentGateway, PaymentStatus } from "@/enums";
import { getOrderModel } from "@/lib/db/models/order.model";
import { OrderFactory } from "@/domain/orders/order-factory";
import { CartService } from "@/services/cart/cart.service";
import { PaymentService } from "@/services/payment/payment.service";
import { NormalizedPaymentStatus } from "@/domain/payment/gateways/gateway-interface";

export type PaymentConfirmationOutcome =
  | { ok: true; status: PaymentStatus; message?: string }
  | {
      ok: false;
      error: string;
      /**
       * Whether calling again could plausibly succeed.
       *
       * Webhook routes map this onto their HTTP status, which is what decides
       * whether the gateway redelivers: a 5xx earns a retry, a 4xx tells the
       * gateway to give up permanently. Getting it wrong is costly in both
       * directions — a 4xx on a transient outage silently drops a real
       * payment, while a 5xx on a rejected one has the gateway redeliver
       * forever against something that can never succeed.
       *
       * True only for upstream/infrastructure faults. Deliberate rejections
       * (underpayment, gateway mismatch, malformed metadata) are false: they
       * need a human, not another delivery attempt.
       */
      retryable: boolean;
      status?: PaymentStatus;
    };

/**
 * The single path through which a gateway's verdict becomes financial truth.
 *
 * Three callers share it, and that sharing is the point — each one used to
 * need its own copy of "verify, then drive the order to a terminal state",
 * and copies drift:
 *
 *   1. Gateway webhooks (Flutterwave, Paystack) — the primary confirmation.
 *   2. The status page's server-side fallback, when a webhook hasn't landed
 *      within a few seconds of the customer returning from the gateway.
 *   3. The cron backstop, sweeping orders still pending long after checkout.
 *
 * Every one of them is safe to run repeatedly and concurrently: the order's
 * own terminal-state guards make confirmation idempotent, so a webhook and a
 * fallback racing on the same reference settle it exactly once.
 *
 * Note what is NOT here: nothing cancels an order because a customer's
 * browser lacked a query parameter. An order leaves Pending only when the
 * gateway itself says so, or when the cron expires it.
 */
export class PaymentConfirmationService {
  /**
   * Verify a transaction against its gateway and settle the order.
   *
   * The gateway is derived from the order record — the source of truth for
   * which provider collected the payment — unless the caller already knows
   * it (a webhook route knows by definition which provider called it).
   *
   * @param reference - Our internal reference: the cart idempotency key.
   * @param providerTransactionId - The provider's own id, when known.
   * @param gateway - Overrides the order's recorded provider.
   */
  static async confirmFromGateway({
    reference,
    providerTransactionId,
    gateway,
  }: {
    reference: string;
    providerTransactionId?: string;
    gateway?: PaymentGateway;
  }): Promise<PaymentConfirmationOutcome> {
    await connectToDatabase();

    const Order = await getOrderModel();
    const order = await Order.findOne({ idempotencyKey: reference })
      .select("_id paymentStatus paymentGateway")
      .lean<{
        _id: mongoose.Types.ObjectId;
        paymentStatus: PaymentStatus;
        paymentGateway?: PaymentGateway;
      }>();

    if (!order) {
      // Not a race: the pending order is created before the payment link is
      // ever issued, so a webhook cannot outrun it. An unknown reference is
      // permanently unknown — redelivering will not conjure the order.
      return {
        ok: false,
        error: `No order found for reference "${reference}".`,
        retryable: false,
      };
    }

    // Already settled — nothing to verify. This is what makes the webhook and
    // the status-page fallback safe to race against each other.
    if (order.paymentStatus !== PaymentStatus.Pending) {
      return {
        ok: true,
        status: order.paymentStatus,
        message: "Order already in a terminal state",
      };
    }

    const resolvedGateway =
      gateway ?? order.paymentGateway ?? PaymentGateway.Flutterwave;

    const verified = await PaymentService.verifyPayment({
      gateway: resolvedGateway,
      refs: { reference, providerTransactionId },
    });

    if (!verified) {
      // The adapter already exhausted its own retries — the gateway is down,
      // timing out, or erroring. Worth another delivery attempt later.
      return {
        ok: false,
        error: "Could not retrieve transaction data from the gateway.",
        retryable: true,
      };
    }

    // Still in flight at the gateway — leave the order pending and let the
    // caller poll again. Never a write.
    if (verified.status === NormalizedPaymentStatus.Pending) {
      return { ok: true, status: PaymentStatus.Pending };
    }

    const processOrder = await OrderFactory.getProcessOrderInstance();
    const session = await mongoose.startSession();

    // Thrown to roll the transaction back on a rejected payment. Carries the
    // outcome so it can be returned rather than surfaced as a crash.
    class RejectedPayment extends Error {
      constructor(readonly outcome: PaymentConfirmationOutcome) {
        super("payment rejected");
      }
    }

    try {
      let outcome!: PaymentConfirmationOutcome;
      let clearCartForUserId: string | undefined;

      // withTransaction (rather than a manual commit) so MongoDB's transient
      // transaction errors — write conflicts, catalog changes, step-downs —
      // are retried automatically, as the driver documentation recommends.
      // The body is safe to re-run: every write below is idempotency-guarded.
      await session.withTransaction(async () => {
        clearCartForUserId = undefined;

        if (verified.status === NormalizedPaymentStatus.Failed) {
          const result = await processOrder.updateOrderRecordToFailureState({
            orderId: order._id.toString(),
            session,
            // The raw status distinguishes a hard failure from an abandoned
            // checkout, which map to Failed and Cancelled respectively.
            transactionDataStatus: verified.rawStatus,
          });

          if (!result.ok) {
            throw new RejectedPayment({
              ok: false,
              error: result.error ?? "Failed to update order",
              retryable: false,
            });
          }

          outcome = { ok: true, status: result.status ?? PaymentStatus.Failed };
          return;
        }

        // Successful — the provider and charged-amount guards inside
        // updateOrderRecordToSuccessState decide whether it is really safe to
        // mark this order paid.
        const { orderId: metadataOrderId, idempotencyKey } = verified.meta;

        if (!metadataOrderId) {
          throw new RejectedPayment({
            ok: false,
            error: "Missing order reference in transaction metadata.",
            retryable: false,
          });
        }

        // Settle the order we resolved from the reference and checked was
        // Pending — never the one the gateway names. Metadata is
        // provider-round-tripped data; if it disagreed, we would both write to
        // an order this call never verified and escape the terminal-state
        // guard above, which was evaluated against a different document.
        const loadedOrderId = order._id.toString();

        if (metadataOrderId !== loadedOrderId) {
          throw new RejectedPayment({
            ok: false,
            error:
              `Order mismatch for reference "${reference}": metadata names ` +
              `order ${metadataOrderId} but the reference resolves to ${loadedOrderId}.`,
            retryable: false,
          });
        }

        const result = await processOrder.updateOrderRecordToSuccessState({
          orderId: loadedOrderId,
          idempotencyKey,
          transactionId: verified.gatewayTransactionId,
          session,
          paymentMethod: verified.paymentMethod,
          customerInfo: {
            fullName: verified.meta.fullName,
            email: verified.meta.email,
          },
          collectionFeeKobo: verified.collectionFeeKobo,
          provider: verified.provider,
          amountPaidKobo: verified.amountKobo,
          currency: verified.currency,
        });

        if (!result.ok) {
          // Covers the deliberate rejections — gateway mismatch, underpayment,
          // currency mismatch — which alert an admin and need a human
          // decision. Redelivery would only repeat the same rejection.
          throw new RejectedPayment({
            ok: false,
            error: result.error ?? "Failed to update order",
            retryable: false,
          });
        }

        clearCartForUserId = result.userId;
        outcome = { ok: true, status: PaymentStatus.Paid };
      });

      // Cart clearing is deliberately outside the financial transaction: a
      // failure here must not roll back a confirmed payment.
      if (clearCartForUserId) {
        try {
          await CartService.clearCart(clearCartForUserId);
        } catch (error) {
          console.error(
            `[PaymentConfirmation] Cart clear failed for user ${clearCartForUserId}`,
            error,
          );
        }
      }

      return outcome;
    } catch (error) {
      if (error instanceof RejectedPayment) return error.outcome;
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Backstop sweep: re-verify orders left Pending long after checkout.
   *
   * Covers every way the primary paths can miss — a webhook that never
   * arrived, a customer who closed the tab before the fallback fired, a
   * gateway outage during the confirmation window. Nothing about an order's
   * fate depends on the customer keeping a page open.
   *
   * Orders younger than `olderThanMinutes` are skipped so the sweep never
   * races a checkout that is still legitimately in progress.
   *
   * @param olderThanMinutes - Minimum age before an order is swept.
   * @param limit - Maximum orders per run, bounding the serverless runtime.
   */
  static async sweepStalePendingOrders({
    olderThanMinutes = 15,
    limit = 100,
  }: {
    olderThanMinutes?: number;
    limit?: number;
  } = {}): Promise<{
    totalEligible: number;
    paid: number;
    failed: number;
    stillPending: number;
    errored: number;
  }> {
    await connectToDatabase();
    const Order = await getOrderModel();

    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const stale = await Order.find({
      paymentStatus: PaymentStatus.Pending,
      createdAt: { $lte: cutoff },
    })
      .select("idempotencyKey paymentGateway")
      .sort({ createdAt: 1 }) // oldest first — they have waited longest
      .limit(limit)
      .lean<{ idempotencyKey: string; paymentGateway?: PaymentGateway }[]>();

    const summary = {
      totalEligible: stale.length,
      paid: 0,
      failed: 0,
      stillPending: 0,
      errored: 0,
    };

    // Sequential on purpose: each iteration opens a MongoDB transaction and
    // calls a gateway API. Concurrency here would buy little and risks both
    // provider rate limits and connection-pool exhaustion on serverless.
    for (const order of stale) {
      try {
        const result = await PaymentConfirmationService.confirmFromGateway({
          reference: order.idempotencyKey,
          gateway: order.paymentGateway,
        });

        if (!result.ok) {
          summary.errored++;
          console.error(
            `[PaymentSweep] ${order.idempotencyKey}: ${result.error}`,
          );
          continue;
        }

        if (result.status === PaymentStatus.Paid) summary.paid++;
        else if (result.status === PaymentStatus.Pending) summary.stillPending++;
        else summary.failed++;
      } catch (error) {
        summary.errored++;
        console.error(
          `[PaymentSweep] ${order.idempotencyKey}: unexpected error`,
          error,
        );
      }
    }

    return summary;
  }
}

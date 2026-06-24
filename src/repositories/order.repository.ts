import mongoose from "mongoose";
import { getOrderModel } from "@/lib/db/models/order.model";
import { DuplicateOrderError } from "../domain/orders/errors";
import type {
  IOrder,
  IOrderDocument,
  ISubOrder,
  IOrderProduct,
} from "@/lib/db/models/order.model";
import type { OrderBuildConfig } from "../domain/orders/types";
import { DeliveryStatus, StatusHistory } from "@/enums";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";

/**
 * OrderRepository handles the persistence layer for orders.
 *
 * This class bridges the domain layer (OrderBuilder) with the persistence
 * layer (MongoDB). All order creation must go through here to guarantee
 * idempotency and consistent document structure.
 *
 * Financial data contract:
 * ─────────────────────────────────────────────────────────────────────────
 * OrderBuildConfig.subOrders is now SubOrderBuildResult[].
 * Each entry carries:
 *   .config      — the validated raw sub-order input (products, shipping, …)
 *   .financials  — the immutable ISubOrderFinancials snapshot computed by
 *                  buildSubOrderFinancials() during OrderBuilder.build()
 *
 * configToDocument reads financial data ONLY from .financials.
 * It does NOT recompute subtotals, discounts, commissions, or settlement
 * amounts. Those numbers were sealed upstream and must not be recalculated
 * here under any circumstances.
 */
export class OrderRepository {
  /**
   * Creates a new order after confirming no duplicate exists.
   *
   * @param config  - Fully built OrderBuildConfig from OrderBuilder.build()
   * @param session - Optional Mongoose ClientSession for transaction support
   * @returns       The saved IOrderDocument
   * @throws {DuplicateOrderError} if an order with the same idempotency key exists
   */
  static async createOrder(
    config: OrderBuildConfig,
    session: mongoose.ClientSession,
  ): Promise<IOrderDocument> {
    const Order = await getOrderModel();

    const existing = await Order.findOne(
      { idempotencyKey: config.idempotencyKey },
      null,
      { session },
    );

    if (existing) {
      throw new DuplicateOrderError(
        "An order with this idempotency key already exists",
      );
    }

    const orderDoc = await this.configToDocument(config);
    return orderDoc.save({ session });
  }

  /**
   * Retrieves an order by ID with populated references.
   *
   * @param orderId - MongoDB ObjectId string
   * @param lean    - Return plain object when true, Mongoose document when false
   */
  static async getOrderById(orderId: string, lean: boolean = false) {
    const OrderModel = await getOrderModel();

    return await QueryBuilderFactory.queryBuilder<IOrder, IOrderDocument>(
      OrderModel,
    )
      .where("_id", new mongoose.Types.ObjectId(orderId))
      .withLean(lean)
      .executeOne();
  }

  /**
   * Retrieves all orders for a specific user.
   *
   * @param userId  - MongoDB ObjectId string
   * @param options - Optional sort, limit, skip controls
   */
  static async getOrdersByUserId(
    userId: string,
    _options?: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number },
  ): Promise<IOrder[]> {
    const OrderModel = await getOrderModel();

    return await QueryBuilderFactory.queryBuilder<IOrder, IOrderDocument>(
      OrderModel,
    )
      .where("userId", new mongoose.Types.ObjectId(userId))
      .execute();
  }

  /**
   * Retrieves paginated orders matching the given conditions.
   *
   * @param matchConditions - MongoDB filter
   * @param options - Pagination { skip, limit }
   * @returns { orders, totalCount }
   */
  static async getStoreOrders(
    matchConditions: any,
    { skip, limit }: { skip: number; limit: number },
  ): Promise<{ orders: IOrder[]; totalCount: number }> {
    const Order = await getOrderModel();

    const [orders, totalCount] = await Promise.all([
      Order.find(matchConditions)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IOrder[]>(),
      Order.countDocuments(matchConditions),
    ]);

    return { orders, totalCount };
  }

  /**
   * Checks if an order already exists for a given idempotency key.
   *
   * @param idempotencyKey - The key to look up
   * @returns The existing lean order, or null
   */
  static async getOrderByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<IOrder | null> {
    const Order = await getOrderModel();
    return Order.findOne({ idempotencyKey }).lean<IOrder>();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Converts an OrderBuildConfig into a Mongoose Order document.
   *
   * Financial data is read directly from each SubOrderBuildResult.financials.
   * No monetary arithmetic is performed here — all figures were computed and
   * sealed by buildSubOrderFinancials() during OrderBuilder.build().
   *
   * Root-level totalAmount derivation:
   *   The order model stores a single totalAmount that represents what the
   *   customer is charged. This is the only computation done here:
   *
   *     totalAmount = Σ(subOrder.financials.amountPaid)
   *                 + Σ(subOrder.config.shippingMethod.price)
   *
   *   amountPaid already has the per-sub-order discount baked in, so adding
   *   shipping on top gives the correct customer-facing total. We do NOT add
   *   the order-level discount again — it is already reflected in amountPaid.
   *
   * @private
   */
  private static async configToDocument(config: OrderBuildConfig) {
    const OrderModel = await getOrderModel();

    // ── Root-level totals ─────────────────────────────────────────────────
    // Read amountPaid from each sub-order's pre-computed financials.
    // Do NOT recalculate subtotals or discounts — they are already locked in.
    const shippingTotal = config.subOrders.reduce(
      (sum, result) => sum + (result.config.shippingMethod.price || 0),
      0,
    );

    const productsAmountPaid = config.subOrders.reduce(
      (sum, result) => sum + result.financials.amountPaid,
      0,
    );

    const totalAmount = productsAmountPaid + shippingTotal;

    // ── Sub-orders ────────────────────────────────────────────────────────
    const subOrders: ISubOrder[] = config.subOrders.map((result) => {
      const { config: subOrder, financials } = result;

      // Build product documents
      const products: IOrderProduct[] = subOrder.products.map((product) => {
        // Effective price for this line item (size price takes precedence)
        const effectivePrice =
          product.selectedSize?.price ?? product.product.price;

        return {
          productId: new mongoose.Types.ObjectId(product.product._id),
          storeId: new mongoose.Types.ObjectId(subOrder.storeId),
          productSnapshot: {
            _id: new mongoose.Types.ObjectId(product.product._id),
            name: product.product.name,
            images: product.product.images,
            price: effectivePrice,
            quantity: product.quantity,
            category: product.product.category,
            subCategory: product.product.subCategory,
            selectedSize: product.selectedSize
              ? {
                  size: product.selectedSize.size,
                  price: product.selectedSize.price,
                }
              : undefined,
          },
        };
      });

      return {
        storeId: new mongoose.Types.ObjectId(subOrder.storeId),
        products,

        // ── Financial snapshot ──────────────────────────────────────────
        // Written verbatim from the pre-computed snapshot.
        // This is the single source of truth for all monetary figures on
        // this sub-order. Nothing is recalculated.
        financials,

        // ── Shipping ────────────────────────────────────────────────────
        shippingMethod: {
          name: subOrder.shippingMethod.name,
          price: subOrder.shippingMethod.price || 0,
          estimatedDeliveryDays:
            subOrder.shippingMethod.estimatedDeliveryDays?.toString(),
          description: subOrder.shippingMethod.description,
        },

        // ── Status ──────────────────────────────────────────────────────
        deliveryStatus: DeliveryStatus.OrderPlaced,
        statusHistory: [
          {
            status: StatusHistory.OrderPlaced,
            timestamp: new Date(),
            notes: "Initial order request created.",
          },
        ],
        customerConfirmedDelivery: {
          confirmed: false,
          autoConfirmed: false,
        },
        storeSnapshot: {
          name: subOrder.storeName,
        },
      } as unknown as ISubOrder;
    });

    // ── Order document ────────────────────────────────────────────────────
    return new OrderModel({
      userId: new mongoose.Types.ObjectId(config.customer.userId),
      userSnapshot: {
        name: config.customer.name,
        email: config.customer.email,
        phoneNumber: config.customer.phoneNumber,
      },
      stores: [
        ...new Set(
          config.subOrders.map(
            (r) => new mongoose.Types.ObjectId(r.config.storeId),
          ),
        ),
      ],
      subOrders,
      totalAmount,
      couponCode: config.couponCode,
      discount: config.discount
        ? {
            amount: config.discount.amount,
            couponCode: config.discount.couponCode,
            type: config.discount.type,
            description: config.discount.description,
          }
        : undefined,
      shippingAddress: {
        postalCode: config.shippingAddress.postalCode,
        city: config.shippingAddress.city,
        state: config.shippingAddress.state,
        address: config.shippingAddress.address,
        deliveryType: config.shippingAddress.deliveryType,
        campusName: config.shippingAddress.campusName,
        campusLocation: config.shippingAddress.campusLocation,
      },
      idempotencyKey: config.idempotencyKey,
      paymentStatus: config.paymentInfo.status || "pending",
      paymentGateway: config.paymentInfo.gateway,
      paymentMethod: config.paymentInfo.method,
      notes: config.notes,
    });
  }
}

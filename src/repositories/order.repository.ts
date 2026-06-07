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

/**
 * OrderService handles the persistence layer for orders
 *
 * This service:
 * - Creates orders using the OrderBuilder pattern
 * - Checks for idempotency (preventing duplicate orders)
 * - Handles MongoDB transactions for consistency
 * - Converts builder output to Mongoose documents
 *
 * @remarks
 * This service bridges the domain layer (OrderBuilder) with the persistence layer (MongoDB).
 * All order creation should go through this service to ensure consistency and idempotency.
 */
export class OrderRepository {
  /**
   * Creates a new order after validating it doesn't already exist
   *
   * Uses idempotency to prevent duplicate orders:
   * - If an order with the same idempotencyKey exists, throws DuplicateOrderError
   * - The caller should handle duplicates by returning the existing order
   *
   * @param config - Order configuration from OrderBuilder.build()
   * @returns The saved order document
   * @throws {DuplicateOrderError} if order with same idempotency key exists
   * @throws Database or validation errors from MongoDB
   *
   * @example
   * ```typescript
   * const config = await orderBuilder.build();
   * const order = await OrderService.createOrder(config);
   * ```
   *
   * @remarks
   * This method should be called within a transaction for consistency.
   * Recommended usage pattern:
   *
   * ```typescript
   * const session = await mongoose.startSession();
   * session.startTransaction();
   * try {
   *   const order = await OrderService.createOrder(config, session);
   *   // ... other operations
   *   await session.commitTransaction();
   * } catch (error) {
   *   await session.abortTransaction();
   *   throw error;
   * } finally {
   *   session.endSession();
   * }
   * ```
   */
  static async createOrder(
    config: OrderBuildConfig,
    session?: mongoose.ClientSession,
  ): Promise<IOrderDocument> {
    const Order = await getOrderModel();

    // Check for duplicate order using idempotency key
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

    // Convert builder config to MongoDB document format
    const orderDoc = await this.configToDocument(config);

    // Save the order
    const savedOrder = await orderDoc.save({ session });

    return savedOrder;
  }

  /**
   * Retrieves an order by ID with populated references
   *
   * @param orderId - MongoDB ID of the order
   * @param lean - If true, returns plain object; if false, returns Mongoose document
   * @returns The order or null if not found
   *
   * @example
   * const order = await OrderService.getOrderById(orderId);
   * const orderData = await OrderService.getOrderById(orderId, true);
   */
  static async getOrderById(
    orderId: string,
    lean: boolean = false,
  ): Promise<IOrderDocument | IOrder | null> {
    const Order = await getOrderModel();

    let query = Order.findById(orderId)
      .populate("userId", "_id firstName lastName email phoneNumber")
      .populate("subOrders.products.productId", "_id name images price")
      .populate("subOrders.storeId", "_id name email");

    if (lean) {
      return query.lean<IOrder>().exec();
    }

    return query.exec();
  }

  /**
   * Retrieves all orders for a specific user
   *
   * @param userId - MongoDB ID of the user
   * @param options - Query options (sort, limit, skip)
   * @returns Array of orders
   *
   * @example
   * const userOrders = await OrderService.getOrdersByUserId(userId, {
   *   sort: { createdAt: -1 },
   *   limit: 10,
   * });
   */
  static async getOrdersByUserId(
    userId: string,
    options?: { sort?: Record<string, 1 | -1>; limit?: number; skip?: number },
  ): Promise<IOrder[]> {
    const Order = await getOrderModel();

    let query = Order.find({ userId });

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return query.lean<IOrder[]>();
  }

  /**
   * Checks if an order exists by idempotency key
   * Useful for handling duplicate requests
   *
   * @param idempotencyKey - The idempotency key to check
   * @returns The existing order if found, null otherwise
   */
  static async getOrderByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<IOrder | null> {
    const Order = await getOrderModel();
    return Order.findOne({ idempotencyKey }).lean<IOrder>();
  }

  // ============================================================================
  // PRIVATE HELPERS - Document construction
  // ============================================================================

  /**
   * Converts OrderBuilder config to a Mongoose document
   *
   * Maps domain-level types to MongoDB schema types:
   * - Creates snapshots for products and stores
   * - Generates status history
   * - Calculates final totals
   *
   * @private
   */
  private static async configToDocument(config: OrderBuildConfig) {
    const OrderModel = await getOrderModel();

    // Calculate total amount
    const subtotal = config.subOrders.reduce((sum, subOrder) => {
      const storeTotal = subOrder.products.reduce((storeSum, product) => {
        const price = product.selectedSize?.price ?? product.product.price;
        return storeSum + price * product.quantity;
      }, 0);
      return sum + storeTotal;
    }, 0);

    const shippingTotal = config.subOrders.reduce(
      (sum, subOrder) => sum + (subOrder.shippingMethod.price || 0),
      0,
    );

    const discountAmount = config.discount?.amount ?? 0;
    const totalAmount = subtotal + shippingTotal - discountAmount;

    // Convert sub-orders to database format
    const subOrders: ISubOrder[] = config.subOrders.map((subOrder) => {
      const products: IOrderProduct[] = subOrder.products.map((product) => {
        const price = product.selectedSize?.price ?? product.product.price;

        return {
          productId: new mongoose.Types.ObjectId(product.product._id),
          storeId: new mongoose.Types.ObjectId(subOrder.storeId),
          productSnapshot: {
            _id: new mongoose.Types.ObjectId(product.product._id),
            name: product.product.name,
            images: product.product.images,
            price,
            quantity: product.quantity,
            category: product.product.category?.[0],
            subCategory: product.product.subCategory,
            selectedSize: product.selectedSize
              ? {
                  size: product.selectedSize.size,
                  price: product.selectedSize.price,
                }
              : undefined,
          },
          storeSnapshot: {
            _id: new mongoose.Types.ObjectId(subOrder.storeId),
            name: subOrder.storeName,
          },
        };
      });

      const storeTotal = products.reduce(
        (sum, p) => sum + p.productSnapshot.price * p.productSnapshot.quantity,
        0,
      );

      const storeDiscount = config.discount
        ? Math.floor((storeTotal / subtotal) * discountAmount)
        : 0;

      const totalAmountForStore = storeTotal - storeDiscount;

      return {
        storeId: new mongoose.Types.ObjectId(subOrder.storeId),
        products,
        originalAmount: storeTotal,
        totalAmount: totalAmountForStore,
        discount: config.discount
          ? {
              amount: storeDiscount,
              couponCode: config.discount.couponCode,
              type: config.discount.type,
              description: config.discount.description,
            }
          : undefined,
        deliveryStatus: DeliveryStatus.OrderPlaced,
        shippingMethod: {
          name: subOrder.shippingMethod.name,
          price: subOrder.shippingMethod.price || 0,
          estimatedDeliveryDays:
            subOrder.shippingMethod.estimatedDeliveryDays?.toString(),
          description: subOrder.shippingMethod.description,
        },
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
      } as unknown as ISubOrder;
    });

    // Create address string
    const addressString = `${config.shippingAddress.state}, ${config.shippingAddress.city}, ${config.shippingAddress.address}`;

    // Create the order document
    return new OrderModel({
      userId: new mongoose.Types.ObjectId(config.customer.userId),
      stores: [
        ...new Set(
          config.subOrders.map((s) => new mongoose.Types.ObjectId(s.storeId)),
        ),
      ],
      subOrders,
      totalAmount,
      couponCode: config.couponCode,
      discount: config.discount
        ? {
            amount: discountAmount,
            couponCode: config.discount.couponCode,
            type: config.discount.type,
            description: config.discount.description,
          }
        : undefined,
      shippingAddress: {
        postalCode: config.shippingAddress.postalCode,
        address: addressString,
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

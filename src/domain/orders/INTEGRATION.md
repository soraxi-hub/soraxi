# Order Builder Integration Guide

Step-by-step guide for integrating the Order Builder into your existing codebase.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration with Existing Code](#integration-with-existing-code)
3. [Migration Strategy](#migration-strategy)
4. [API Endpoint Examples](#api-endpoint-examples)
5. [Payment Gateway Integration](#payment-gateway-integration)
6. [Inventory Integration](#inventory-integration)
7. [Webhook Handling](#webhook-handling)
8. [Testing Integration](#testing-integration)

## Quick Start

### 1. Import the Components

```typescript
// In your route handler or service
import {
  OrderBuilder,
  OrderService,
  OrderCalculations,
  type CustomerInfo,
  type ShippingAddressInfo,
} from '@/lib/domain/order';
```

### 2. Create an Order

```typescript
async function createOrderHandler(req: Request) {
  try {
    const { customer, address, payment, items } = req.body;

    // Build the order
    const config = new OrderBuilder()
      .setCustomer(customer)
      .setShippingAddress(address)
      .setPaymentInfo(payment)
      .addSubOrder(items)
      .setIdempotencyKey(req.headers.get('idempotency-key'))
      .build();

    // Persist the order
    const order = await OrderService.createOrder(config);

    return Response.json({ order });
  } catch (error) {
    // Handle errors
    return handleOrderError(error);
  }
}
```

## Integration with Existing Code

### From Your Current `createPendingOrder()`

Your existing code:
```typescript
// From order.service.ts
async createPendingOrder({ user, cart, input }: CreatePendingOrderParams) {
  // ... existing validation and setup ...

  const orderDoc = new Order({
    userId: user.id,
    stores: storeIds,
    subOrders,
    totalAmount: amount,
    // ... etc
  });

  return orderDoc.save({ session });
}
```

Convert to OrderBuilder pattern:
```typescript
async createPendingOrderWithBuilder({
  user,
  cart,
  input,
}: CreatePendingOrderParams) {
  const builder = new OrderBuilder();

  // Set customer from user
  builder.setCustomer({
    userId: user.id,
    email: user.email,
    name: user.name,
    phoneNumber: user.phoneNumber,
  });

  // Set shipping address from input
  builder.setShippingAddress({
    address: input.meta.address,
    city: input.meta.city,
    state: input.meta.state,
    postalCode: input.meta.postal_code,
    deliveryType: input.meta.deliveryType,
    campusName: input.meta.campusName,
    campusLocation: input.meta.campusLocation,
  });

  // Set payment info
  builder.setPaymentInfo({
    gateway: PaymentGateway.Flutterwave,
    method: input.paymentMethod,
  });

  // Add sub-orders from cart
  for (const cartStore of input.cartItemsWithShippingMethod) {
    builder.addSubOrder({
      storeId: cartStore.storeId,
      storeName: cartStore.storeName,
      products: cartStore.products.map(item => ({
        product: {
          _id: item.product._id,
          storeId: item.product.storeId,
          name: item.product.name,
          price: item.selectedSize?.price ?? item.product.price,
          images: item.product.images,
        },
        quantity: item.quantity,
        selectedSize: item.selectedSize,
      })),
      shippingMethod: {
        name: cartStore.selectedShippingMethod?.name,
        price: cartStore.selectedShippingMethod?.price ?? 0,
        estimatedDeliveryDays: cartStore.selectedShippingMethod?.estimatedDeliveryDays,
        description: cartStore.selectedShippingMethod?.description,
      },
    });
  }

  // Apply discount if present
  if (input.meta.couponCode) {
    const coupon = await CouponService.validateCoupon({
      code: input.meta.couponCode,
      userId: user.id,
      orderTotal: input.amount,
    });

    const discountAmount = DiscountCalculator.calculateDiscount(
      { type: coupon.type, value: coupon.value },
      input.amount,
    );

    builder.applyDiscount({
      amount: discountAmount,
      couponCode: input.meta.couponCode,
      type: coupon.type,
      description: `Coupon discount: ${input.meta.couponCode}`,
    });
  }

  // Set idempotency key
  builder.setIdempotencyKey(cart.idempotencyKey);

  // Build configuration
  const config = builder.build();

  // Create and persist order
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await OrderService.createOrder(config, session);
    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

## Migration Strategy

### Phase 1: Parallel Implementation

Run both systems side-by-side during initial integration:

```typescript
async function createOrder(params: CreatePendingOrderParams) {
  // New way (builder)
  const orderBuilderResult = await createPendingOrderWithBuilder(params);

  // Old way (existing)
  const orderExistingResult = await createPendingOrder(params);

  // Compare results in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Builder result:', orderBuilderResult);
    console.log('Existing result:', orderExistingResult);
    // Assert they're equivalent
  }

  // Return builder result (once tested)
  return orderBuilderResult;
}
```

### Phase 2: Gradual Rollout

Use feature flags to gradually migrate users:

```typescript
async function createOrderWithFeatureFlag(params: CreatePendingOrderParams) {
  const useBuilder = await getFeatureFlag('use-order-builder');

  if (useBuilder) {
    return createPendingOrderWithBuilder(params);
  } else {
    return createPendingOrder(params);
  }
}
```

### Phase 3: Full Migration

Once builder is tested and stable:

```typescript
// Remove old implementation
async function createOrder(params: CreatePendingOrderParams) {
  return createPendingOrderWithBuilder(params);
}
```

## API Endpoint Examples

### Example 1: Checkout Endpoint (with Validation)

```typescript
// POST /api/orders/checkout
export async function POST(request: Request) {
  try {
    // Validate request body
    const body = await request.json();
    const validation = flutterwaveInputSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        { error: 'Invalid order data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const input = validation.data;
    const user = await getCurrentUser(); // From your auth system

    // Build the order
    const config = new OrderBuilder()
      .setCustomer({
        userId: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
      })
      .setShippingAddress({
        address: input.meta.address,
        city: input.meta.city,
        state: input.meta.state,
        postalCode: input.meta.postal_code,
        deliveryType: input.meta.deliveryType,
      })
      .setPaymentInfo({
        gateway: PaymentGateway.Flutterwave,
      });

    // Add sub-orders
    for (const store of input.cartItemsWithShippingMethod) {
      config.addSubOrder({
        storeId: store.storeId,
        storeName: store.storeName,
        products: store.products,
        shippingMethod: store.selectedShippingMethod,
      });
    }

    // Apply coupon if provided
    if (input.meta.couponCode) {
      const coupon = await validateCoupon(input.meta.couponCode, user.id);
      const discount = OrderCalculations.calculateDiscount(
        input.amount,
        coupon.type,
        coupon.value
      );

      config.applyDiscount({
        amount: discount,
        couponCode: input.meta.couponCode,
        type: coupon.type,
      });
    }

    // Finalize
    const orderConfig = config
      .setIdempotencyKey(request.headers.get('idempotency-key') || crypto.randomUUID())
      .build();

    // Create with transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await OrderService.createOrder(orderConfig, session);

      // Initialize payment with gateway
      const paymentRef = await FlutterwaveService.initializePayment({
        amount: order.totalAmount,
        orderId: order._id,
        customer: {
          email: input.customer.email,
          name: input.customer.name,
          phone_number: input.customer.phone_number,
        },
      });

      // Store payment reference in order
      await Order.findByIdAndUpdate(
        order._id,
        { paymentReference: paymentRef },
        { session }
      );

      await session.commitTransaction();

      return Response.json({
        order: order._id,
        paymentUrl: paymentRef.payment_link,
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    return handleOrderError(error);
  }
}

function handleOrderError(error: unknown): Response {
  if (error instanceof IncompleteOrderError) {
    return Response.json({ error: error.message }, { status: 400 });
  } else if (error instanceof InvalidDiscountError) {
    return Response.json({ error: 'Invalid discount' }, { status: 400 });
  } else if (error instanceof DuplicateOrderError) {
    return Response.json(
      { error: 'Duplicate order detected' },
      { status: 409 }
    );
  } else {
    console.error('Order creation error:', error);
    return Response.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
```

### Example 2: Get Order Details

```typescript
// GET /api/orders/:orderId
export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const user = await getCurrentUser();
    const order = await OrderService.getOrderById(params.orderId, true);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify ownership
    if (order.userId.toString() !== user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return Response.json({ order });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
```

### Example 3: List User Orders

```typescript
// GET /api/orders?page=1&limit=10
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const url = new URL(request.url);

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const orders = await OrderService.getOrdersByUserId(user.id, {
      sort: { createdAt: -1 },
      limit,
      skip,
    });

    return Response.json({
      orders,
      pagination: { page, limit, total: orders.length },
    });
  } catch (error) {
    return Response.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
```

## Payment Gateway Integration

### Flutterwave Integration

```typescript
// lib/services/payment/flutterwave.service.ts
import {
  OrderBuilder,
  OrderService,
  type OrderBuildConfig,
} from '@/lib/domain/order';
import axios from 'axios';

export class FlutterwaveOrderService {
  /**
   * Creates an order and initializes Flutterwave payment
   */
  static async createOrderAndInitiatePayment(
    config: OrderBuildConfig,
    customerData: {
      email: string;
      name: string;
      phoneNumber: string;
    }
  ) {
    // Create order first
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await OrderService.createOrder(config, session);

      // Initialize Flutterwave payment
      const paymentResponse = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        {
          tx_ref: order._id.toString(),
          amount: order.totalAmount / 100, // Convert kobo to naira
          currency: 'NGN',
          payment_options: 'card, ussd, bank_account, bank_transfer, mobile_money',
          customer: {
            email: customerData.email,
            phonenumber: customerData.phoneNumber,
            name: customerData.name,
          },
          meta: {
            orderId: order._id.toString(),
            userId: config.customer.userId,
          },
          redirect_url: `${process.env.APP_URL}/payment/callback`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          },
        }
      );

      if (!paymentResponse.data.data.link) {
        throw new Error('Failed to initialize payment');
      }

      // Store payment reference
      await Order.findByIdAndUpdate(
        order._id,
        {
          paymentReference: paymentResponse.data.data.link,
          paymentGatewayRef: paymentResponse.data.data.id,
        },
        { session }
      );

      await session.commitTransaction();

      return {
        order,
        paymentUrl: paymentResponse.data.data.link,
        paymentRef: paymentResponse.data.data.id,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Verifies payment and updates order status
   */
  static async verifyPaymentAndUpdateOrder(
    transactionRef: string,
    orderId: string
  ) {
    const verifyResponse = await axios.get(
      `https://api.flutterwave.com/v3/transactions/${transactionRef}/verify`,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const { status, amount } = verifyResponse.data.data;

    if (status === 'successful') {
      // Update order payment status
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: PaymentStatus.Paid,
          'statusHistory': [
            {
              status: StatusHistory.Processing,
              timestamp: new Date(),
              notes: 'Payment confirmed. Processing order.',
            },
          ],
        },
        { new: true }
      );

      return order;
    } else {
      throw new Error(`Payment failed with status: ${status}`);
    }
  }
}
```

## Inventory Integration

### Reserve Inventory Before Creating Order

```typescript
// lib/services/inventory/inventory.service.ts
import { OrderBuilder } from '@/lib/domain/order';

export class InventoryService {
  /**
   * Reserve inventory for an order
   */
  static async reserveForOrder(config: OrderBuildConfig) {
    const reservations = [];

    try {
      for (const subOrder of config.subOrders) {
        for (const product of subOrder.products) {
          const reservation = await this.reserve({
            productId: product.product._id,
            quantity: product.quantity,
            orderId: config.idempotencyKey,
            durationMinutes: 30, // 30-minute hold
          });

          reservations.push(reservation);
        }
      }

      return reservations;
    } catch (error) {
      // Release all reservations on error
      for (const reservation of reservations) {
        await this.release(reservation.id);
      }
      throw error;
    }
  }

  private static async reserve(params: {
    productId: string;
    quantity: number;
    orderId: string;
    durationMinutes: number;
  }) {
    // Implementation depends on your inventory system
    // Could be REST API call, database operation, etc.
    return {
      id: crypto.randomUUID(),
      ...params,
    };
  }

  private static async release(reservationId: string) {
    // Release the reservation
  }
}
```

Integration in checkout:

```typescript
export async function POST(request: Request) {
  try {
    const input = await request.json();
    const user = await getCurrentUser();

    // Build order configuration
    const config = new OrderBuilder()
      .setCustomer(...)
      .setShippingAddress(...)
      .setPaymentInfo(...)
      .addSubOrder(...)
      .setIdempotencyKey(...)
      .build();

    // Reserve inventory BEFORE creating order
    const reservations = await InventoryService.reserveForOrder(config);

    try {
      // Create order with reserved inventory
      const order = await OrderService.createOrder(config);

      // Initialize payment (links to order)
      const payment = await FlutterwaveOrderService.initializePayment(config);

      return Response.json({
        order: order._id,
        paymentUrl: payment.paymentUrl,
      });
    } catch (error) {
      // Release reservations if order creation fails
      for (const res of reservations) {
        await InventoryService.release(res.id);
      }
      throw error;
    }
  } catch (error) {
    return handleOrderError(error);
  }
}
```

## Webhook Handling

### Payment Confirmation Webhook

```typescript
// POST /api/webhooks/flutterwave
export async function POST(request: Request) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('verif-hash');
    const secretHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(request.body) + process.env.FLUTTERWAVE_SECRET_KEY)
      .digest('hex');

    if (signature !== secretHash) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { data } = await request.json();
    const { tx_ref: orderId, status, amount } = data;

    if (status === 'successful') {
      // Update order
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: PaymentStatus.Paid,
          'subOrders.$[].deliveryStatus': DeliveryStatus.Processing,
        },
        { new: true }
      );

      // Trigger downstream events
      await NotificationService.sendOrderConfirmation(order);
      await InventoryService.commitReservations(orderId);
      await FulfillmentService.createShipment(order);

      return Response.json({ status: 'ok' });
    } else {
      // Payment failed
      const order = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: PaymentStatus.Failed },
        { new: true }
      );

      await NotificationService.sendPaymentFailed(order);
      await InventoryService.releaseReservations(orderId);

      return Response.json({ status: 'ok' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

## Testing Integration

### Integration Test Example

```typescript
// __tests__/lib/domain/order/integration.test.ts
import { OrderBuilder, OrderService } from '@/lib/domain/order';
import { getOrderModel } from '@/lib/db/models/order.model';
import mongoose from 'mongoose';

describe('Order Builder Integration', () => {
  let connection: mongoose.Connection;

  beforeAll(async () => {
    connection = await mongoose.connect(process.env.MONGODB_TEST_URI);
  });

  afterAll(async () => {
    await connection.disconnect();
  });

  it('should create a complete order with all features', async () => {
    const customerId = new mongoose.Types.ObjectId();
    const storeId = new mongoose.Types.ObjectId();

    const config = new OrderBuilder()
      .setCustomer({
        userId: customerId.toString(),
        email: 'test@example.com',
        name: 'Test User',
        phoneNumber: '+2348012345678',
      })
      .setShippingAddress({
        address: '123 Test St',
        city: 'Lagos',
        state: 'Lagos State',
        postalCode: '100001',
        deliveryType: 'off-campus',
      })
      .setPaymentInfo({
        gateway: 'flutterwave',
      })
      .addSubOrder({
        storeId: storeId.toString(),
        storeName: 'Test Store',
        products: [
          {
            product: {
              _id: new mongoose.Types.ObjectId().toString(),
              storeId: storeId.toString(),
              name: 'Test Product',
              price: 10000,
              images: ['test.jpg'],
            },
            quantity: 2,
          },
        ],
        shippingMethod: {
          name: 'Standard',
          price: 2000,
        },
      })
      .applyDiscount({
        amount: 1000,
        couponCode: 'TEST10',
        type: 'fixed',
      })
      .setIdempotencyKey(crypto.randomUUID())
      .build();

    const order = await OrderService.createOrder(config);

    expect(order).toBeDefined();
    expect(order._id).toBeDefined();
    expect(order.totalAmount).toBe(21000); // 10000*2 + 2000 - 1000
    expect(order.subOrders).toHaveLength(1);
  });

  it('should prevent duplicate orders', async () => {
    const key = crypto.randomUUID();

    const config = new OrderBuilder()
      .setCustomer(mockCustomer)
      .setShippingAddress(mockAddress)
      .setPaymentInfo(mockPayment)
      .addSubOrder(mockSubOrder)
      .setIdempotencyKey(key)
      .build();

    // Create first order
    const order1 = await OrderService.createOrder(config);

    // Attempt to create duplicate
    const order2Config = new OrderBuilder()
      .setCustomer(mockCustomer)
      .setShippingAddress(mockAddress)
      .setPaymentInfo(mockPayment)
      .addSubOrder(mockSubOrder)
      .setIdempotencyKey(key) // Same key
      .build();

    expect(() => OrderService.createOrder(order2Config))
      .rejects.toThrow('Duplicate order detected');
  });
});
```

## Troubleshooting

### Common Issues

**Issue: "Order is incomplete"**
- Verify all required fields are set before build()
- Check that at least one sub-order is added

**Issue: "Discount exceeds order subtotal"**
- Validate coupon discount before applying
- Check coupon calculation logic

**Issue: "Duplicate order detected"**
- Ensure unique idempotency keys per request
- Check for retry logic causing duplicate keys

**Issue: "MongoDB connection error"**
- Ensure MongoDB is running
- Check connection string in environment variables
- Verify network connectivity

## Best Practices

1. **Always use idempotency keys** - Prevents duplicate orders from retries
2. **Use transactions for multi-store orders** - Ensures consistency
3. **Validate coupons before discount** - Prevents invalid discounts
4. **Reserve inventory before creating order** - Prevents overselling
5. **Log all payment events** - Helps with dispute resolution
6. **Test edge cases** - Fractional discounts, multiple stores, etc.
7. **Monitor error rates** - Track validation and persistence errors
8. **Use lean queries** - Improve performance for read operations

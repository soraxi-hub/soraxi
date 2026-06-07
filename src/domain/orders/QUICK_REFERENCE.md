# Order Builder - Quick Reference Card

Keep this handy while developing with the Order Builder pattern.

## Basic Usage

### Create Simple Order
```typescript
import { OrderBuilder, OrderService } from '@/lib/domain/order';
import { PaymentGateway, DeliveryType } from '@/enums';

const config = new OrderBuilder()
  .setCustomer({
    userId: "user123",
    email: "user@example.com",
    name: "John Doe",
    phoneNumber: "+2348012345678",
  })
  .setShippingAddress({
    address: "123 Main St",
    city: "Lagos",
    state: "Lagos State",
    postalCode: "100001",
    deliveryType: DeliveryType.OffCampus,
  })
  .setPaymentInfo({
    gateway: PaymentGateway.Flutterwave,
  })
  .addSubOrder({
    storeId: "store1",
    storeName: "TechStore",
    products: [
      {
        product: {
          _id: "prod123",
          storeId: "store1",
          name: "Laptop",
          price: 500000, // kobo
          images: ["img.jpg"],
        },
        quantity: 1,
      },
    ],
    shippingMethod: {
      name: "Express",
      price: 5000, // kobo
      estimatedDeliveryDays: 1,
    },
  })
  .setIdempotencyKey(crypto.randomUUID())
  .build();

const order = await OrderService.createOrder(config);
```

## Common Patterns

### Multi-Store Order
```typescript
.addSubOrder(subOrder1)
.addSubOrder(subOrder2)
.addSubOrder(subOrder3)
// Each store = separate sub-order
```

### With Discount
```typescript
.applyDiscount({
  amount: 10000,
  couponCode: "SAVE10",
  type: CouponTypeEnum.Fixed,
  description: "Coupon discount: SAVE10",
})
```

### With Transaction
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  const order = await OrderService.createOrder(config, session);
  // ... other operations ...
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Preview Totals
```typescript
const builder = new OrderBuilder()
  .setCustomer(customer)
  // ... other setup ...

const totals = builder.calculateTotals();
console.log(`Total: ${totals.total} kobo`);
console.log(`Subtotal: ${totals.subtotal} kobo`);
console.log(`Shipping: ${totals.shipping} kobo`);
console.log(`Discount: ${totals.discount} kobo`);

const config = builder.setIdempotencyKey(key).build();
const order = await OrderService.createOrder(config);
```

### Retrieve Orders
```typescript
// Get single order
const order = await OrderService.getOrderById(orderId);

// Get as plain object (faster)
const order = await OrderService.getOrderById(orderId, true);

// Get user's orders with pagination
const orders = await OrderService.getOrdersByUserId(userId, {
  sort: { createdAt: -1 },
  limit: 10,
  skip: 0,
});

// Check for duplicate (idempotency)
const existing = await OrderService.getOrderByIdempotencyKey(key);
if (existing) return existing;
```

## Validation Reference

### Built-In Validations

**Product**
- ID: non-empty string
- Store ID: non-empty string
- Name: non-empty string
- Price: positive number
- Images: at least one URL
- Quantity: 1-999
- Size (optional): must have name and price

**Shipping**
- Name: required string
- Price: non-negative
- Days (optional): positive integer

**Address**
- All fields required: address, city, state, postal code
- Delivery type: campus OR off-campus
- If campus: campusName and campusLocation required

**Customer**
- User ID: non-empty string
- Email: valid format
- Name: non-empty string
- Phone: at least 10 digits

**Discount**
- Type: percentage (0-100) OR fixed
- Amount: cannot exceed subtotal
- Coupon code: optional string

## Error Types

| Error | When | Solution |
|-------|------|----------|
| `IncompleteOrderError` | Missing required field | Add missing field |
| `InvalidDiscountError` | Discount > subtotal | Verify discount amount |
| `InvalidCustomerError` | Bad customer data | Check email/phone format |
| `InvalidAddressError` | Missing/bad address | Validate all address fields |
| `InvalidProductError` | Bad product data | Check product fields |
| `InvalidShippingError` | Bad shipping method | Verify shipping data |
| `DuplicateOrderError` | Idempotency key exists | Use different key or return existing |
| `InvalidOrderStateError` | Modifying built order | Create new builder instance |

## Monetary Values

**All in kobo (₦1 = 100 kobo)**

```typescript
const prices = {
  laptop: 500000,      // ₦5,000.00
  shipping: 2000,      // ₦20.00
  discount: 50000,     // ₦500.00
  total: 452000,       // ₦4,520.00
};

// Calculate percentage discount
const discount = (total * 10) / 100; // 10% = kobo * 10 / 100

// Never use floating point!
// ❌ const total = 10000.5;
// ✅ const total = 10050;
```

## Type Imports

```typescript
import {
  // Classes
  OrderBuilder,
  OrderService,
  OrderCalculations,
  OrderValidators,
  
  // Types
  type OrderBuildConfig,
  type OrderTotals,
  type CustomerInfo,
  type ShippingAddressInfo,
  type SubOrderConfig,
  type OrderProductItem,
  type ShippingMethod,
  type DiscountInfo,
  
  // Errors
  OrderDomainError,
  IncompleteOrderError,
  InvalidDiscountError,
  DuplicateOrderError,
  // ... other errors
} from '@/lib/domain/order';
```

## Enum Values

```typescript
import { DeliveryType, PaymentGateway, CouponTypeEnum, PaymentStatus, DeliveryStatus } from '@/enums';

// DeliveryType
DeliveryType.OffCampus  // "off-campus"
DeliveryType.Campus     // "campus"

// PaymentGateway
PaymentGateway.Flutterwave // "flutterwave"
PaymentGateway.Paystack    // "paystack"

// CouponTypeEnum
CouponTypeEnum.Fixed       // "fixed"
CouponTypeEnum.Percentage  // "percentage"

// PaymentStatus
PaymentStatus.Pending   // "pending"
PaymentStatus.Paid      // "paid"
PaymentStatus.Failed    // "failed"
PaymentStatus.Refunded  // "refunded"

// DeliveryStatus
DeliveryStatus.OrderPlaced      // "order_placed"
DeliveryStatus.Processing       // "processing"
DeliveryStatus.Shipped          // "shipped"
DeliveryStatus.Delivered        // "delivered"
```

## API Response Template

```typescript
// Success
Response.json({
  order: {
    _id: "order123",
    userId: "user123",
    totalAmount: 450000,
    paymentStatus: "pending",
    subOrders: [...],
    createdAt: "2026-05-24T10:00:00Z",
  }
})

// Duplicate (idempotency)
Response.json({ order: existing }, { status: 409 })

// Validation error
Response.json({ error: "Invalid discount" }, { status: 400 })

// Not found
Response.json({ error: "Order not found" }, { status: 404 })

// Server error
Response.json({ error: "Failed to create order" }, { status: 500 })
```

## Testing Template

```typescript
describe('OrderBuilder', () => {
  it('should create valid order', () => {
    const config = new OrderBuilder()
      .setCustomer(mockCustomer)
      .setShippingAddress(mockAddress)
      .setPaymentInfo(mockPayment)
      .addSubOrder(mockSubOrder)
      .setIdempotencyKey("test-key")
      .build();

    expect(config.customer).toBeDefined();
    expect(config.subOrders).toHaveLength(1);
  });

  it('should validate customer', () => {
    expect(() => {
      new OrderBuilder().setCustomer({
        userId: "",
        email: "invalid",
        name: "",
        phoneNumber: "123",
      });
    }).toThrow(InvalidCustomerError);
  });
});
```

## Debugging Tips

### Check Builder State (before build)
```typescript
const builder = new OrderBuilder()
  .setCustomer(customer)
  .setShippingAddress(address);

console.log(builder.getState());
// Output:
// {
//   customer: {...},
//   shippingAddress: {...},
//   paymentInfo: undefined,
//   subOrderCount: 0,
//   hasDiscount: false,
//   isBuilt: false
// }
```

### Check Totals
```typescript
const totals = builder.calculateTotals();
console.log(`Subtotal: ${totals.subtotal}`);
console.log(`Discount: ${totals.discount}`);
console.log(`Shipping: ${totals.shipping}`);
console.log(`Total: ${totals.total}`);
```

### Catch Specific Errors
```typescript
try {
  const config = builder.build();
} catch (error) {
  if (error instanceof InvalidDiscountError) {
    console.log("Discount issue:", error.message);
  } else if (error instanceof IncompleteOrderError) {
    console.log("Missing fields:", error.message);
  } else {
    console.log("Other error:", error);
  }
}
```

## Performance Tips

1. **Preview totals before persisting**
   ```typescript
   const totals = builder.calculateTotals();
   // Validate before build/persist
   const config = builder.build();
   ```

2. **Use lean queries for read-only**
   ```typescript
   const order = await OrderService.getOrderById(id, true); // lean = true
   ```

3. **Batch database operations**
   ```typescript
   const session = await mongoose.startSession();
   session.startTransaction();
   // Multiple operations in one transaction
   ```

4. **Reuse builder for validation**
   ```typescript
   const builder = new OrderBuilder()
     .setCustomer(customer)
     .setShippingAddress(address)
     .setPaymentInfo(payment)
     .addSubOrder(subOrder);
   
   // Validate without building
   const totals = builder.calculateTotals();
   
   // Then build and persist
   const config = builder.setIdempotencyKey(key).build();
   ```

## Common Mistakes to Avoid

```typescript
// ❌ WRONG: Floating point money
const price = 500.50; // WRONG!
const total = 1000.75; // WRONG!

// ✅ RIGHT: Integer kobo
const price = 50050; // ₦500.50
const total = 100075; // ₦1000.75

// ❌ WRONG: Modifying after build
const config = builder.build();
builder.applyDiscount({...}); // ERROR!

// ✅ RIGHT: Build once
const config = builder
  .setCustomer(customer)
  .setShippingAddress(address)
  // ... complete setup ...
  .build();

// ❌ WRONG: Same idempotency key for different orders
const key = "my-key";
orderService.createOrder(config1, key); // OK
orderService.createOrder(config2, key); // ERROR! Duplicate

// ✅ RIGHT: Unique key per order
const key1 = crypto.randomUUID();
const key2 = crypto.randomUUID();
orderService.createOrder(config1, key1); // OK
orderService.createOrder(config2, key2); // OK

// ❌ WRONG: Not handling errors
const order = await OrderService.createOrder(config);

// ✅ RIGHT: Handle all error types
try {
  const order = await OrderService.createOrder(config);
} catch (error) {
  if (error instanceof DuplicateOrderError) {
    // Handle duplicate
  } else if (error instanceof InvalidDiscountError) {
    // Handle discount issue
  } else {
    // Handle other errors
  }
}
```

## File Locations Quick Map

| Need | File |
|------|------|
| Getting started | README.md |
| How to use | examples.ts |
| Why designed this way | ARCHITECTURE.md |
| How to integrate with your code | INTEGRATION.md |
| Deployment checklist | IMPLEMENTATION_CHECKLIST.md |
| High-level overview | SUMMARY.md |
| This card | QUICK_REFERENCE.md |
| Core functionality | order-builder.ts |
| Database operations | order-service.ts |
| Money calculations | calculations.ts |
| Input validation | validators.ts |
| Type definitions | types.ts |
| Error definitions | errors.ts |
| Public API | index.ts |

## One-Minute Setup

```typescript
// 1. Import
import { OrderBuilder, OrderService } from '@/lib/domain/order';

// 2. Build
const config = new OrderBuilder()
  .setCustomer(customer)
  .setShippingAddress(address)
  .setPaymentInfo(payment)
  .addSubOrder(subOrder)
  .setIdempotencyKey(crypto.randomUUID())
  .build();

// 3. Create
const order = await OrderService.createOrder(config);

// Done! 🎉
```

---

**For detailed information, see the full documentation files.**

Last Updated: 2026-05-24

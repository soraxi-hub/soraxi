# Order Domain Module

Production-grade Order Builder pattern implementation following Domain-Driven Design (DDD) and SOLID principles.

## Overview

This module provides a robust, extensible system for building and persisting e-commerce orders with:

- **Builder Pattern**: Fluent API for constructing complex orders
- **Domain-Driven Design**: Clear separation of concerns and business logic
- **Comprehensive Validation**: Data integrity at every step
- **Type Safety**: Full TypeScript support with zero `any` types
- **Immutability**: Prevents accidental mutations of order state
- **Error Handling**: Domain-specific, actionable error messages
- **Transactional Safety**: MongoDB session support for consistency
- **Idempotency**: Prevents duplicate orders from retry requests

## Architecture

```
lib/domain/order/
├── order-builder.ts      # Core builder class (fluent API)
├── order-service.ts      # Persistence layer (MongoDB integration)
├── types.ts              # Domain types and interfaces
├── errors.ts             # Domain-specific errors
├── calculations.ts       # Monetary calculations
├── validators.ts         # Input validation utilities
├── examples.ts           # Usage examples
├── index.ts              # Public API
└── README.md             # This file
```

## Core Components

### 1. OrderBuilder

The fluent API for constructing orders step-by-step.

```typescript
const order = new OrderBuilder()
  .setCustomer(customerInfo)
  .setShippingAddress(addressInfo)
  .setPaymentInfo(paymentInfo)
  .addSubOrder(subOrderConfig)
  .applyDiscount(discountInfo)
  .setIdempotencyKey(uuid)
  .build();
```

**Features:**
- Fluent method chaining for readability
- Validates at every step
- Immutable state transitions
- Prevents modifications after build()
- Supports complex multi-store orders

### 2. OrderService

Handles persistence and retrieval of orders.

```typescript
// Create order
const order = await OrderService.createOrder(config, session);

// Retrieve orders
const order = await OrderService.getOrderById(orderId);
const orders = await OrderService.getOrdersByUserId(userId);
const existing = await OrderService.getOrderByIdempotencyKey(key);
```

**Features:**
- Idempotency checking (prevents duplicates)
- Transaction support for consistency
- Automatic snapshot generation
- Total calculation and verification
- Status history generation

### 3. OrderCalculations

Utilities for monetary calculations with precision.

```typescript
// Calculate totals
const total = OrderCalculations.calculateProductsTotal(items);
const discount = OrderCalculations.calculateDiscount(subtotal, type, value);
const distributed = OrderCalculations.distributeDiscount(amount, proportions);
const totals = OrderCalculations.calculateOrderTotals(subtotal, shipping, discount);

// Validate
OrderCalculations.validateTotal(expected, actual);
OrderCalculations.validatePositiveAmount(amount);
```

**Key Points:**
- All values in kobo (smallest currency unit)
- No floating-point arithmetic
- Proportional distribution with remainder handling
- Complete input validation

### 4. OrderValidators

Validates all order components against business rules.

```typescript
OrderValidators.validateProduct(product);
OrderValidators.validateShippingMethod(method);
OrderValidators.validateShippingAddress(address);
OrderValidators.validateCustomer(customer);
OrderValidators.validateIdempotencyKey(key);
```

**Validation Includes:**
- Required field presence
- Data type correctness
- Format validation (emails, phone numbers)
- Business rule compliance
- Boundary constraints

## Usage Patterns

### Pattern 1: Simple Order (Single Store)

```typescript
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
    products: [{
      product: {
        _id: "prod1",
        storeId: "store1",
        name: "Laptop",
        price: 500000,
        images: ["img.jpg"],
      },
      quantity: 1,
    }],
    shippingMethod: {
      name: "Express",
      price: 5000,
      estimatedDeliveryDays: 1,
    },
  })
  .setIdempotencyKey(crypto.randomUUID())
  .build();

const order = await OrderService.createOrder(config);
```

### Pattern 2: Multi-Store Order with Transaction

```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const config = new OrderBuilder()
    .setCustomer(customer)
    .setShippingAddress(address)
    .setPaymentInfo(payment)
    .addSubOrder(subOrder1)
    .addSubOrder(subOrder2)
    .setIdempotencyKey(key)
    .build();

  const order = await OrderService.createOrder(config, session);
  
  // ... other operations with session ...
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Pattern 3: Order with Discount

```typescript
const discountAmount = 10000; // kobo

const config = new OrderBuilder()
  .setCustomer(customer)
  .setShippingAddress(address)
  .setPaymentInfo(payment)
  .addSubOrder(subOrder)
  .applyDiscount({
    amount: discountAmount,
    couponCode: "SAVE10",
    type: CouponTypeEnum.Fixed,
    description: "Coupon discount: SAVE10",
  })
  .setIdempotencyKey(key)
  .build();

const order = await OrderService.createOrder(config);
```

### Pattern 4: Handling Idempotency

```typescript
// Check if order already exists
const existing = await OrderService.getOrderByIdempotencyKey(idempotencyKey);

if (existing) {
  // Return existing order instead of creating new one
  return existing;
}

// Create new order
const config = new OrderBuilder()
  // ... setup ...
  .setIdempotencyKey(idempotencyKey)
  .build();

const order = await OrderService.createOrder(config);
return order;
```

### Pattern 5: Preview Totals Before Persistence

```typescript
const builder = new OrderBuilder()
  .setCustomer(customer)
  .setShippingAddress(address)
  .setPaymentInfo(payment)
  .addSubOrder(subOrder);

// Preview totals
const totals = builder.calculateTotals();
console.log(`Order total: ${totals.total} kobo`);
console.log(`Discount: ${totals.discount} kobo`);

// Build and persist
const config = builder.setIdempotencyKey(key).build();
const order = await OrderService.createOrder(config);
```

## Error Handling

All errors are domain-specific and include clear messaging:

```typescript
try {
  const order = await OrderService.createOrder(config);
} catch (error) {
  if (error instanceof IncompleteOrderError) {
    // Handle missing required data
    res.status(400).json({ error: error.message });
  } else if (error instanceof InvalidDiscountError) {
    // Handle invalid discount
    res.status(400).json({ error: "Discount exceeds order total" });
  } else if (error instanceof DuplicateOrderError) {
    // Handle duplicate order (retry scenario)
    const existing = await OrderService.getOrderByIdempotencyKey(key);
    res.json({ order: existing });
  } else {
    // Handle unexpected errors
    res.status(500).json({ error: "Failed to create order" });
  }
}
```

## Monetary Values

**Important:** All monetary values are in **kobo** (smallest currency unit).

- 1 Naira = 100 kobo
- Example: ₦50.00 = 5000 kobo
- No floating-point arithmetic used
- Use with currency conversion utilities in your payment gateway integration

Example:
```typescript
const price = 50000; // ₦500.00
const shippingFee = 2000; // ₦20.00
const discount = 5000; // ₦50.00
const total = price + shippingFee - discount; // ₦470.00 = 47000 kobo
```

## Validation Rules

### Products
- ID: non-empty string
- Store ID: non-empty string
- Name: non-empty string
- Price: positive number
- Images: at least one URL
- Quantity: 1-999 (positive integer)

### Shipping
- Name: required string
- Price: non-negative number
- Estimated days: positive integer (optional)

### Address
- Address: required string
- City: required string
- State: required string
- Postal code: required string
- Delivery type: valid enum value
- Campus fields: required for campus delivery

### Customer
- User ID: non-empty string
- Email: valid email format
- Name: non-empty string
- Phone: at least 10 digits

### Discounts
- Amount: non-negative, cannot exceed subtotal
- Type: percentage (0-100) or fixed amount
- Coupon code: optional string reference

## Scalability Considerations

### Future Enhancements

1. **Inventory Reservation**
   ```typescript
   // Not yet implemented
   const reservation = await InventoryService.reserve(
     productId,
     quantity,
     duration,
   );
   builder.addReservation(reservation);
   ```

2. **Tax Calculation**
   ```typescript
   // Not yet implemented
   const tax = await TaxService.calculate(
     items,
     shippingAddress,
   );
   builder.setTax(tax);
   ```

3. **Payment Verification**
   ```typescript
   // Can be added to OrderService.createOrder()
   const verification = await PaymentGateway.verify(paymentRef);
   if (!verification.success) {
     throw new PaymentVerificationError();
   }
   ```

4. **Order Snapshots for Audit**
   ```typescript
   // Already implemented via snapshots
   // Historical data preserved: product names, prices, store info at purchase time
   ```

### Performance Tips

1. **Batch Operations**: Use transaction sessions for multi-store orders
2. **Lean Queries**: Use `lean: true` for read-only operations
3. **Indexing**: Ensure indexes on `userId`, `idempotencyKey`, `createdAt`
4. **Connection Pooling**: Configure MongoDB connection pool for concurrent orders

### Database Indexes

```javascript
// Recommended indexes in MongoDB
db.orders.createIndex({ userId: 1, createdAt: -1 });
db.orders.createIndex({ idempotencyKey: 1 }, { unique: true });
db.orders.createIndex({ "subOrders.storeId": 1 });
db.orders.createIndex({ paymentStatus: 1 });
db.orders.createIndex({ createdAt: -1 });
```

## Integration with Existing Code

### With Current OrderService

The new `OrderBuilder` and `OrderService` are designed to coexist with your existing `order.service.ts`. You can:

1. **Gradually migrate** existing code to use the builder
2. **Run parallel** implementations during transition
3. **Convert** existing `createPendingOrder()` logic to use the builder

### Integration Example

```typescript
// Old approach (existing code)
const order = await OrderService.createPendingOrder({
  user,
  cart,
  input: flutterwaveInput,
});

// New approach (builder pattern)
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
  })
  // ... add sub-orders from cart ...
  .setIdempotencyKey(cart.idempotencyKey)
  .build();

const order = await OrderService.createOrder(config);
```

## Testing

The builder pattern makes testing easier:

```typescript
// Easy to test with minimal setup
const config = new OrderBuilder()
  .setCustomer(mockCustomer)
  .setShippingAddress(mockAddress)
  .setPaymentInfo(mockPayment)
  .addSubOrder(mockSubOrder)
  .setIdempotencyKey("test-key")
  .build();

expect(config.customer).toEqual(mockCustomer);
expect(config.subOrders).toHaveLength(1);
expect(config.idempotencyKey).toBe("test-key");
```

## Security Considerations

1. **Input Validation**: All inputs validated before processing
2. **Immutability**: Prevents accidental state mutations
3. **Type Safety**: TypeScript prevents type-related exploits
4. **Transaction Safety**: Database transactions prevent race conditions
5. **Idempotency**: Prevents duplicate charges or orders
6. **Field Freezing**: Domain objects frozen to prevent tampering

## Contributing

When extending this module:

1. Follow the existing code style and patterns
2. Add comprehensive JSDoc comments
3. Include unit tests for new functionality
4. Update this README with new patterns
5. Maintain backward compatibility

## License

Part of your e-commerce platform.

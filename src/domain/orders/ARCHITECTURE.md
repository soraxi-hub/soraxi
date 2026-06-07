# Order Domain Architecture

Deep dive into the architectural decisions and design patterns used in the Order Domain module.

## Table of Contents

1. [Design Principles](#design-principles)
2. [Architectural Patterns](#architectural-patterns)
3. [Layer Separation](#layer-separation)
4. [Data Flow](#data-flow)
5. [Error Handling Strategy](#error-handling-strategy)
6. [Immutability Design](#immutability-design)
7. [Validation Strategy](#validation-strategy)
8. [Scalability Design](#scalability-design)

## Design Principles

### 1. Domain-Driven Design (DDD)

This module implements DDD to isolate business logic from infrastructure concerns.

**Benefits:**
- Business rules live in domain classes (OrderBuilder, OrderCalculations)
- Infrastructure code (MongoDB) separated in OrderService
- Easy to test business logic without database
- Clear communication between domain and infrastructure teams

**Structure:**
```
lib/domain/order/           # Domain layer
├── order-builder.ts        # Core business logic
├── calculations.ts         # Business calculations
├── validators.ts           # Business rules
├── types.ts                # Domain models
├── errors.ts               # Domain exceptions
└── order-service.ts        # Application layer (bridges domain & infrastructure)
```

### 2. SOLID Principles

#### S - Single Responsibility
- `OrderBuilder`: Builds orders
- `OrderCalculations`: Handles monetary math
- `OrderValidators`: Validates data
- `OrderService`: Persists orders
- Each class has one reason to change

#### O - Open/Closed
- Easy to extend with new calculations (add methods to OrderCalculations)
- Easy to add new validators (add methods to OrderValidators)
- New builder methods don't break existing code

#### L - Liskov Substitution
- All validation methods throw consistent error types
- Interchangeable error subclasses in catch blocks

#### I - Interface Segregation
- Small, focused type interfaces (CustomerInfo, PaymentInfo, etc.)
- Clients only depend on methods they use
- No bloated god objects

#### D - Dependency Inversion
- Builder doesn't depend on concrete MongoDB implementation
- OrderService depends on abstraction (Mongoose Model)
- Easy to swap database with another implementation

### 3. Builder Pattern

Incremental construction with validation at each step.

```typescript
// Linear, explicit progression
const order = new OrderBuilder()
  .setCustomer(...)      // Step 1
  .setShippingAddress(...) // Step 2
  .setPaymentInfo(...)    // Step 3
  .addSubOrder(...)       // Step 4
  .applyDiscount(...)     // Step 5 (optional)
  .setIdempotencyKey(...) // Step 6
  .build();               // Final validation & freeze
```

**Why this pattern:**
- Readable, natural English flow
- Validates each step independently
- Prevents partially-constructed invalid orders
- Type-safe method chaining
- Easy to test each step

## Architectural Patterns

### 1. Fluent Interface (Method Chaining)

```typescript
// Fluent - reads like a sentence
const order = builder
  .setCustomer(c)
  .setPaymentInfo(p)
  .build();

// Not fluent - verbose
builder.setCustomer(c);
builder.setPaymentInfo(p);
const order = builder.build();
```

**Implementation:**
```typescript
setCustomer(customer: CustomerInfo): this {
  // validate
  this.customer = customer;
  return this; // Return self for chaining
}
```

### 2. Immutable Value Objects

```typescript
// Objects frozen after creation
private customer?: CustomerInfo;

setCustomer(customer: CustomerInfo): this {
  OrderValidators.validateCustomer(customer);
  this.customer = Object.freeze({ ...customer });
  return this;
}
```

**Why:**
- Prevents accidental mutations
- Thread-safe (even in concurrent scenarios)
- Easier to reason about code
- Facilitates time-travel debugging

### 3. Fail-Fast Validation

Validate early, fail immediately with clear errors.

```typescript
// Validation at every step
setCustomer(customer: CustomerInfo): this {
  this.throwIfBuilt();              // Check state
  OrderValidators.validateCustomer(customer); // Validate input
  this.customer = Object.freeze(customer);    // Store
  return this;
}
```

**Not:**
```typescript
// Validate only at build (late failure)
setCustomer(customer: CustomerInfo): this {
  this.customer = customer;
  return this;
}
```

### 4. Snapshot Pattern

Store frozen snapshots of products/stores at purchase time.

```typescript
// Product snapshot preserves data at order time
productSnapshot: {
  _id: "123",
  name: "Widget v1",      // Product name when purchased
  price: 5000,            // Price when purchased
  images: ["..."],        // Images when purchased
  selectedSize: {
    size: "Large",
    price: 6000,
  },
}
```

**Why:**
- Historical accuracy (what customer actually bought)
- Price history tracking
- Audit trail for disputes
- Prevents retroactive price changes affecting old orders

## Layer Separation

### Domain Layer

**Responsibility:** Business logic and rules

**Files:**
- `order-builder.ts` - Order construction
- `calculations.ts` - Monetary calculations
- `validators.ts` - Data validation rules
- `types.ts` - Domain models
- `errors.ts` - Domain exceptions

**Characteristics:**
- No MongoDB imports
- No external dependencies (except enums)
- 100% testable without database
- Immutable data structures
- Clear business rule documentation

**Example:**
```typescript
// Domain layer - pure business logic
export class OrderCalculations {
  static calculateDiscount(subtotal: number, type: string, value: number): number {
    // Business rule: discount cannot exceed subtotal
    if (value > subtotal) {
      throw new InvalidDiscountError(...);
    }
    // Calculation logic
    return result;
  }
}
```

### Application Layer

**Responsibility:** Coordinate domain and infrastructure

**Files:**
- `order-service.ts` - Persistence coordination

**Characteristics:**
- Orchestrates domain logic
- Handles MongoDB operations
- Transaction management
- Converts domain objects to/from database format

**Example:**
```typescript
// Application layer - bridges domain and DB
export class OrderService {
  static async createOrder(config: OrderBuildConfig): Promise<IOrderDocument> {
    // Use domain logic
    const calculated = OrderCalculations.calculateTotals(...);
    
    // Persist to database
    const doc = new Order(convertToDB(config));
    return doc.save();
  }
}
```

### Infrastructure Layer

**Responsibility:** Database access

**Files:**
- `order.model.ts` (in `/lib/db/models/`)
- MongoDB schema definition
- Query helpers

**Not included in this module** - exists in main project.

### Data Flow

```
┌─────────────────────────────────────┐
│     Route Handler / Controller      │
│  (Receives user request)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Domain Layer                    │
│  OrderBuilder.build()               │
│  - Validates each step              │
│  - Calculates totals                │
│  - Returns OrderBuildConfig         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Application Layer               │
│  OrderService.createOrder()         │
│  - Checks idempotency              │
│  - Converts config to document     │
│  - Manages transactions            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Infrastructure Layer            │
│  Order.save()                       │
│  - MongoDB persistence             │
│  - Index queries                   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     Database                        │
│  MongoDB Collection: orders         │
└─────────────────────────────────────┘
```

## Error Handling Strategy

### Error Hierarchy

```
Error (JavaScript built-in)
  │
  └─ OrderDomainError (base domain error)
      ├─ IncompleteOrderError
      ├─ InvalidOrderTotalsError
      ├─ InvalidDiscountError
      ├─ InvalidSubOrderError
      ├─ InvalidProductError
      ├─ InvalidShippingError
      ├─ InvalidOrderStateError
      ├─ TotalCalculationError
      ├─ InvalidPaymentError
      ├─ InvalidAddressError
      ├─ InvalidCustomerError
      └─ DuplicateOrderError
```

### Error Categorization

**Validation Errors** - Invalid input data
- InvalidProductError
- InvalidShippingError
- InvalidAddressError
- InvalidCustomerError

**Business Rule Errors** - Violates business logic
- InvalidDiscountError (discount > subtotal)
- InvalidOrderTotalsError (totals don't match)
- InvalidPaymentError (missing payment gateway)

**State Errors** - Invalid operation for current state
- InvalidOrderStateError (modifying built order)
- IncompleteOrderError (missing required fields)

**Persistence Errors** - Database-related
- DuplicateOrderError (idempotency check failed)

### Error Handling in Routes

```typescript
async function POST(request: Request) {
  try {
    const config = new OrderBuilder()
      .setCustomer(...)
      .setShippingAddress(...)
      .setPaymentInfo(...)
      .addSubOrder(...)
      .setIdempotencyKey(...)
      .build();

    const order = await OrderService.createOrder(config);
    return Response.json({ order });

  } catch (error) {
    if (error instanceof IncompleteOrderError) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    } else if (error instanceof InvalidDiscountError) {
      return Response.json(
        { error: "Discount exceeds order total" },
        { status: 400 }
      );
    } else if (error instanceof DuplicateOrderError) {
      // Handle retry case
      const existing = await OrderService.getOrderByIdempotencyKey(key);
      return Response.json({ order: existing });
    } else {
      console.error("Unexpected error:", error);
      return Response.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }
  }
}
```

## Immutability Design

### Why Immutability

1. **Predictability** - Values don't change unexpectedly
2. **Concurrency** - Safe from race conditions
3. **Debugging** - Easier to trace state changes
4. **Testing** - Simpler assertions and mocks

### Implementation

**Using `Object.freeze()`**
```typescript
this.customer = Object.freeze({ ...customer });
```

**Using `readonly` modifiers**
```typescript
export interface CustomerInfo {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly phoneNumber: string;
}
```

**Preventing Modification After Build**
```typescript
private isBuilt = false;

private throwIfBuilt(): void {
  if (this.isBuilt) {
    throw new InvalidOrderStateError("Order already built");
  }
}

build(): OrderBuildConfig {
  this.isBuilt = true; // Lock for modifications
  return Object.freeze(config);
}
```

## Validation Strategy

### Three-Level Validation

#### Level 1: Type System
```typescript
// TypeScript compiler catches type errors at compile-time
const customer: CustomerInfo = {
  userId: "123",        // ✓ string
  email: "user@ex.com", // ✓ string
  phone: "123",         // ✗ Expected phoneNumber: string
};
```

#### Level 2: Runtime Validation
```typescript
// OrderValidators catch logic errors at runtime
OrderValidators.validateCustomer(customer);
// Throws InvalidCustomerError if email format is invalid
```

#### Level 3: Business Rule Validation
```typescript
// OrderCalculations enforce business logic
const discount = OrderCalculations.calculateDiscount(...);
// Throws InvalidDiscountError if discount > subtotal
```

### Validation Scope

**At each method call:**
```typescript
setCustomer(customer: CustomerInfo): this {
  OrderValidators.validateCustomer(customer); // Immediate validation
  this.customer = Object.freeze(customer);
  return this;
}
```

**At build time:**
```typescript
build(): OrderBuildConfig {
  this.validateCompleteness();    // All required fields present
  try {
    this.calculateTotals();       // Totals are valid
  } catch (error) {
    throw new IncompleteOrderError(...);
  }
  // ... rest of build
}
```

## Scalability Design

### Horizontal Scaling

**Stateless Builder**
```typescript
// Each request gets its own builder instance
const builder = new OrderBuilder();
// No shared state, safe for concurrent requests
```

**Session-Based Transactions**
```typescript
// Multiple operations in single transaction
const session = await mongoose.startSession();
session.startTransaction();
// All operations use same session
await OrderService.createOrder(config, session);
await session.commitTransaction();
```

### Vertical Scaling

**Efficient Calculations**
- O(n) product total calculation (one pass)
- O(n) store total aggregation
- No nested loops or exponential operations

**Index-Friendly Queries**
```typescript
// Queries that benefit from indexes
Order.find({ userId: userId })           // Indexed
Order.find({ idempotencyKey: key })      // Indexed
Order.find({ createdAt: { $gte: date }}) // Indexed
```

### Future Extensibility

**Hooks for Extensions**
```typescript
// Easy to add inventory reservation
class InventoryReservation {
  static async reserve(productId, quantity): Promise<Reservation> { }
}

// Could integrate as:
builder.addReservation(reservation);
```

**Calculation Extensions**
```typescript
// Easy to add tax, shipping surcharge, etc.
class TaxCalculations {
  static calculate(items, address): number { }
}

// Could integrate as:
const taxAmount = TaxCalculations.calculate(...);
builder.addTax(taxAmount);
```

## Key Decisions & Rationale

### Decision 1: Builder vs. Constructor

**Decision:** Use Builder pattern instead of constructor

**Rationale:**
- Orders have many optional and required fields
- Order construction involves complex validation
- Method chaining reads naturally
- Each step is independently testable
- Prevents invalid intermediate states

### Decision 2: Immutable Value Objects

**Decision:** Freeze objects after creation

**Rationale:**
- Prevents accidental mutations
- Makes code more predictable
- Improves testability
- Essential for distributed systems
- Minimal performance overhead

### Decision 3: Separate Validation Classes

**Decision:** Separate validators into OrderValidators

**Rationale:**
- Single Responsibility Principle
- Easy to locate validation logic
- Can be reused in other services
- Easy to test validation rules independently
- Clear separation from business logic

### Decision 4: Snapshot Pattern

**Decision:** Store snapshots of products/stores in orders

**Rationale:**
- Historical accuracy (data as it was at purchase time)
- Prevents retroactive price/name changes
- Audit trail for disputes
- Customer can reference exact what they purchased
- Supports regulatory compliance (some markets require historical pricing)

### Decision 5: Idempotency Key

**Decision:** Require idempotency key at build time

**Rationale:**
- Prevents duplicate orders from retried requests
- Each request must provide unique key (UUID)
- Enables safe retry logic
- Payment gateway expects idempotency for consistency

## Testing Strategy

### Unit Testing (Domain Layer)

```typescript
describe('OrderBuilder', () => {
  it('should validate customer before setting', () => {
    expect(() => {
      new OrderBuilder().setCustomer({
        userId: '',
        email: 'invalid',
        name: '',
        phoneNumber: '123',
      });
    }).toThrow(InvalidCustomerError);
  });

  it('should calculate totals correctly', () => {
    const builder = new OrderBuilder()
      .setCustomer(mockCustomer)
      // ... other setup ...
      .addSubOrder(mockSubOrder);

    const totals = builder.calculateTotals();
    expect(totals.total).toBe(expected);
  });
});
```

### Integration Testing

```typescript
describe('OrderService', () => {
  it('should prevent duplicate orders via idempotency', async () => {
    const key = 'unique-key-123';

    const order1 = await OrderService.createOrder(config, session);
    expect(() => 
      OrderService.createOrder(config, session)
    ).toThrow(DuplicateOrderError);
  });
});
```

## Performance Considerations

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| setCustomer() | O(1) | Single object freeze |
| addSubOrder() | O(p) | p = products in sub-order |
| calculateTotals() | O(s*p) | s = stores, p = products |
| build() | O(s*p) | Full validation pass |

### Space Complexity

| Component | Space | Notes |
|-----------|-------|-------|
| Builder instance | O(s*p) | All sub-orders in memory |
| Frozen objects | O(1) | Reference copies, minimal overhead |
| Built config | O(s*p) | Same as builder state |

### Optimization Tips

1. **Batch database operations** - Use transactions for multi-store orders
2. **Reuse validators** - Create singleton validators if needed
3. **Cache calculations** - Don't recalculate totals unnecessarily
4. **Stream large orders** - For very large orders, consider pagination

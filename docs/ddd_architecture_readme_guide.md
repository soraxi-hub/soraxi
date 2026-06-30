# Domain-Driven Architecture Guide

This guide explains the purpose, responsibilities, and usage of the core architectural layers commonly used in scalable backend applications:

- Domain
- Repository
- Factory
- Service

The examples use TypeScript-style syntax and patterns commonly found in Node.js, Next.js, and tRPC applications.

---

# 1. Domain Layer

## What is the Domain Layer?

The Domain Layer contains the core business logic and rules of your application.

It represents the real-world concepts your system is built around.

Examples:

- User
- Cart
- Order
- Product
- Payment
- Notification

The domain layer should focus on:

- Business rules
- Data validation
- State management
- Encapsulation
- Business behavior

The domain layer should NOT know:

- Databases
- APIs
- HTTP requests
- UI frameworks
- External services

The domain should be pure business logic.

---

## Why the Domain Layer Matters

Without a domain layer:

- Business logic gets scattered everywhere
- Controllers become bloated
- Validation becomes duplicated
- Code becomes difficult to test
- Rules become inconsistent

The domain layer centralizes business behavior.

---

## Example Domain Entity

```ts
export interface CartItemProps {
  productId: string;
  quantity: number;
  size?: string;
}

export interface CartProps {
  userId: string;
  items: CartItemProps[];
}

export class Cart {
  constructor(private props: CartProps) {}

  get userId() {
    return this.props.userId;
  }

  get items() {
    return this.props.items;
  }

  addItem(item: CartItemProps) {
    const existingItem = this.props.items.find(
      (i) => i.productId === item.productId && i.size === item.size
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
      return;
    }

    this.props.items.push(item);
  }

  removeItem(productId: string) {
    this.props.items = this.props.items.filter(
      (item) => item.productId !== productId
    );
  }

  clearCart() {
    this.props.items = [];
  }
}
```

---

## Responsibilities of a Domain Entity

A domain entity should:

- Protect business rules
- Encapsulate internal state
- Expose meaningful methods
- Prevent invalid operations
- Represent real business concepts

A domain entity should NOT:

- Query databases directly
- Send emails
- Call APIs
- Know about Express, Next.js, or tRPC
- Handle HTTP responses

---

## Good Domain Design Principles

### 1. Encapsulation

Internal state should be controlled through methods.

Bad:

```ts
cart.items.push(item);
```

Good:

```ts
cart.addItem(item);
```

---

### 2. Business-Focused Naming

Methods should describe business actions.

Good:

```ts
order.markAsPaid();
cart.clearCart();
product.applyDiscount();
```

Bad:

```ts
setPaidTrue();
updateField();
modifyArray();
```

---

### 3. Keep Rules Inside the Domain

Bad:

```ts
if (cart.items.length > 10) {
  throw new Error("Too many items");
}
```

Good:

```ts
cart.addItem(item);
```

The domain should enforce the rules internally.

---

## Folder Structure Example

```txt
src/
 ├── domain/
 │    ├── cart/
 │    │    ├── cart.ts
 │    │    ├── cart-interface.ts
 │    │    └── cart-types.ts
 │    │
 │    ├── order/
 │    └── product/
```

---

# 2. Repository Layer

## What is a Repository?

A repository is responsible for data access.

It acts as the bridge between:

- The domain layer
- The database

The repository hides database implementation details from the rest of the application.

Instead of this:

```ts
await CartModel.findById(id);
```

You use:

```ts
await cartRepository.findById(id);
```

---

## Why Repositories Matter

Repositories provide:

- Separation of concerns
- Easier testing
- Cleaner architecture
- Database abstraction
- Reusable queries
- Consistent data access

---

## Repository Responsibilities

Repositories should:

- Fetch data
- Save data
- Update data
- Delete data
- Convert database models into domain entities

Repositories should NOT:

- Contain business rules
- Handle HTTP logic
- Perform UI operations

---

## Repository Example

```ts
import { Cart } from "../domain/cart/cart";
import { CartModel } from "../db/models/cart.model";

export class CartRepository {
  async findByUserId(userId: string): Promise<Cart | null> {
    const cart = await CartModel.findOne({ userId }).lean();

    if (!cart) {
      return null;
    }

    return new Cart({
      userId: cart.userId.toString(),
      items: cart.items,
    });
  }

  async save(cart: Cart): Promise<void> {
    await CartModel.updateOne(
      { userId: cart.userId },
      {
        userId: cart.userId,
        items: cart.items,
      },
      { upsert: true }
    );
  }
}
```

---

## Repository Pattern Benefits

### 1. Database Independence

You can switch databases without changing business logic.

Example:

- MongoDB → PostgreSQL
- Prisma → Drizzle
- REST API → GraphQL

Only the repository changes.

---

### 2. Easier Testing

You can mock repositories during tests.

```ts
const mockRepository = {
  findByUserId: jest.fn(),
  save: jest.fn(),
};
```

---

### 3. Cleaner Services

Without repositories:

```ts
const cart = await CartModel.findOne({ userId });
```

With repositories:

```ts
const cart = await cartRepository.findByUserId(userId);
```

Services become cleaner and easier to read.

---

## Common Repository Methods

```ts
findById()
findAll()
findByUserId()
save()
update()
delete()
exists()
count()
```

---

## Folder Structure Example

```txt
src/
 ├── repositories/
 │    ├── cart-repository.ts
 │    ├── order-repository.ts
 │    └── product-repository.ts
```

---

# 3. Factory Layer

## What is a Factory?

A factory is responsible for creating complex objects.

Factories centralize object creation logic.

Instead of:

```ts
const order = new Order({
  ...manyFields,
});
```

You use:

```ts
const order = OrderFactory.create(data);
```

---

## Why Factories Matter

Factories help when:

- Object creation is complicated
- Multiple objects must be created together
- Defaults are needed
- Validation is required during creation
- Creation logic is reused often

---

## Factory Example

```ts
import { Order } from "../domain/order/order";

export class OrderFactory {
  static create(params: {
    userId: string;
    items: any[];
    shippingAddress: string;
  }) {
    return new Order({
      userId: params.userId,
      items: params.items,
      shippingAddress: params.shippingAddress,
      status: "pending",
      createdAt: new Date(),
    });
  }
}
```

---

## Responsibilities of a Factory

Factories should:

- Create objects
- Apply defaults
- Normalize input
- Build complex entities
- Ensure valid construction

Factories should NOT:

- Save data to the database
- Handle HTTP requests
- Execute business workflows

---

## Common Use Cases

### 1. Default Values

```ts
status: "pending"
createdAt: new Date()
```

---

### 2. Complex Initialization

```ts
const orderItems = products.map(product => ({
  productId: product.id,
  price: product.price,
  quantity: 1,
}));
```

---

### 3. Multiple Entity Creation

Factories can create nested entities.

```ts
Order
 ├── OrderItems
 ├── ShippingInfo
 └── PaymentInfo
```

---

## Factory vs Constructor

### Constructor

Simple object creation.

```ts
new Product(props)
```

### Factory

Complex creation logic.

```ts
ProductFactory.createFromCatalog(data)
```

---

## Folder Structure Example

```txt
src/
 ├── factories/
 │    ├── order-factory.ts
 │    ├── cart-factory.ts
 │    └── user-factory.ts
```

---

# 4. Service Layer

## What is a Service?

A service coordinates application workflows.

It sits between:

- Controllers / tRPC procedures
- Domain entities
- Repositories
- External systems

Services orchestrate operations.

---

## What Services Should Do

Services should:

- Coordinate multiple repositories
- Execute workflows
- Handle transactions
- Call external APIs
- Combine domain operations
- Implement application-level logic

---

## Service Example

```ts
import { CartRepository } from "../repositories/cart-repository";
import { OrderRepository } from "../repositories/order-repository";
import { OrderFactory } from "../factories/order-factory";

export class CheckoutService {
  constructor(
    private cartRepository: CartRepository,
    private orderRepository: OrderRepository
  ) {}

  async checkout(userId: string) {
    const cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      throw new Error("Cart not found");
    }

    const order = OrderFactory.create({
      userId,
      items: cart.items,
      shippingAddress: "Default Address",
    });

    await this.orderRepository.save(order);

    cart.clearCart();

    await this.cartRepository.save(cart);

    return order;
  }
}
```

---

## Why Services Matter

Without services:

- Controllers become huge
- Logic gets duplicated
- Workflows become difficult to maintain
- Business processes become scattered

Services centralize workflows.

---

## Service Responsibilities

### Good Responsibilities

- Checkout flow
- Authentication flow
- Payment flow
- Notification orchestration
- Inventory synchronization

### Bad Responsibilities

- Raw database queries
- UI rendering
- HTTP response formatting

---

## Service vs Domain

### Domain

Handles business rules.

Example:

```ts
cart.addItem(item)
```

### Service

Handles workflows.

Example:

```ts
checkoutService.checkout(userId)
```

---

## Service vs Repository

### Repository

Responsible for:

```ts
save()
findById()
delete()
```

### Service

Responsible for:

```ts
checkout()
placeOrder()
completePayment()
```

---

## Folder Structure Example

```txt
src/
 ├── services/
 │    ├── checkout-service.ts
 │    ├── auth-service.ts
 │    ├── payment-service.ts
 │    └── notification-service.ts
```

---

# 5. How Everything Works Together

## High-Level Flow

```txt
Controller / tRPC Procedure
          ↓
       Service
          ↓
   Domain Entities
          ↓
     Repository
          ↓
      Database
```

---

## Real Example Flow

### User Adds Item to Cart

### Step 1 — API Layer

```ts
await cartService.addItem(userId, item);
```

---

### Step 2 — Service Layer

```ts
const cart = await cartRepository.findByUserId(userId);
```

---

### Step 3 — Domain Layer

```ts
cart.addItem(item);
```

Business rules are enforced.

---

### Step 4 — Repository Layer

```ts
await cartRepository.save(cart);
```

Data is persisted.

---

# 6. Recommended Architecture Structure

```txt
src/
 ├── domain/
 │    ├── cart/
 │    ├── order/
 │    └── product/
 │
 ├── repositories/
 │    ├── cart-repository.ts
 │    ├── order-repository.ts
 │    └── product-repository.ts
 │
 ├── factories/
 │    ├── order-factory.ts
 │    └── cart-factory.ts
 │
 ├── services/
 │    ├── checkout-service.ts
 │    ├── auth-service.ts
 │    └── payment-service.ts
 │
 ├── routers/
 ├── db/
 └── lib/
```

---

# 7. Common Mistakes

## 1. Putting Everything Inside Services

Bad:

```ts
service.validate();
service.calculate();
service.modify();
```

Business rules belong in the domain.

---

## 2. Letting Domains Access the Database

Bad:

```ts
class Cart {
  async save() {}
}
```

Persistence belongs in repositories.

---

## 3. Fat Controllers

Bad:

```ts
router.post(async () => {
  // 200 lines of business logic
});
```

Controllers should delegate to services.

---

## 4. Repositories Containing Business Logic

Bad:

```ts
if (cart.total > 1000) {
  // apply discount
}
```

That belongs in the domain.

---

# 8. Best Practices

## Keep Layers Focused

Each layer should have one clear responsibility.

---

## Use Dependency Injection

```ts
constructor(private repository: CartRepository) {}
```

This improves testing and flexibility.

---

## Keep Business Logic Centralized

Business rules should live inside domain entities.

---

## Prefer Composition Over Duplication

Reuse:

- services
- repositories
- factories
- domain methods

---

## Keep Controllers Thin

Controllers should:

- Receive input
- Validate basic request structure
- Call services
- Return responses

---

# 9. Summary

## Domain

Represents business concepts and rules.

Examples:

- Cart
- Order
- Product

---

## Repository

Handles data persistence and retrieval.

Examples:

- save()
- findById()
- delete()

---

## Factory

Handles complex object creation.

Examples:

- createOrder()
- createCart()

---

## Service

Coordinates workflows and application operations.

Examples:

- checkout()
- authenticateUser()
- processPayment()

---

# Final Mental Model

Think of the architecture like a company:

## Domain

The workers who know how the business operates.

---

## Repository

The storage department.

Responsible for saving and retrieving information.

---

## Factory

The assembly line.

Responsible for building objects correctly.

---

## Service

The manager.

Responsible for coordinating workflows across the system.


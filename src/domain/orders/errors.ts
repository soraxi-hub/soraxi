/**
 * Domain errors for Order operations
 * These errors represent business logic violations and invalid states
 * Production-ready error handling with clear messaging
 */

/**
 * Base domain error class for all order-related exceptions
 */
export abstract class OrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when attempting to build an order with incomplete required data
 * @example
 * throw new IncompleteOrderError("Customer information is required");
 */
export class IncompleteOrderError extends OrderDomainError {
  constructor(message: string = "Order is incomplete and cannot be built") {
    super(message);
  }
}

/**
 * Thrown when order totals are invalid (e.g., negative amounts)
 * @example
 * throw new InvalidOrderTotalsError("Total cannot be negative");
 */
export class InvalidOrderTotalsError extends OrderDomainError {
  constructor(
    message: string = "Order totals are invalid or inconsistent",
  ) {
    super(message);
  }
}

/**
 * Thrown when a discount exceeds the order subtotal or results in negative amounts
 * @example
 * throw new InvalidDiscountError("Discount exceeds order subtotal");
 */
export class InvalidDiscountError extends OrderDomainError {
  constructor(
    message: string = "Discount amount is invalid for this order",
  ) {
    super(message);
  }
}

/**
 * Thrown when a sub-order configuration is invalid
 * @example
 * throw new InvalidSubOrderError("Sub-order must contain at least one product");
 */
export class InvalidSubOrderError extends OrderDomainError {
  constructor(
    message: string = "Sub-order configuration is invalid",
  ) {
    super(message);
  }
}

/**
 * Thrown when product data is invalid or missing required fields
 * @example
 * throw new InvalidProductError("Product ID is required");
 */
export class InvalidProductError extends OrderDomainError {
  constructor(message: string = "Product data is invalid") {
    super(message);
  }
}

/**
 * Thrown when a shipping method is invalid or missing
 * @example
 * throw new InvalidShippingError("Shipping method must have a valid price");
 */
export class InvalidShippingError extends OrderDomainError {
  constructor(message: string = "Shipping method is invalid") {
    super(message);
  }
}

/**
 * Thrown when attempting an operation on an order in an invalid state
 * @example
 * throw new InvalidOrderStateError("Cannot modify a completed order");
 */
export class InvalidOrderStateError extends OrderDomainError {
  constructor(
    message: string = "Order is in an invalid state for this operation",
  ) {
    super(message);
  }
}

/**
 * Thrown when a total calculation fails or produces inconsistent results
 * @example
 * throw new TotalCalculationError("Sub-order totals do not match expected amount");
 */
export class TotalCalculationError extends OrderDomainError {
  constructor(message: string = "Total calculation failed") {
    super(message);
  }
}

/**
 * Thrown when payment information is invalid
 * @example
 * throw new InvalidPaymentError("Payment gateway is required");
 */
export class InvalidPaymentError extends OrderDomainError {
  constructor(message: string = "Payment information is invalid") {
    super(message);
  }
}

/**
 * Thrown when shipping address is invalid or incomplete
 * @example
 * throw new InvalidAddressError("Postal code is required for delivery");
 */
export class InvalidAddressError extends OrderDomainError {
  constructor(message: string = "Shipping address is invalid") {
    super(message);
  }
}

/**
 * Thrown when customer information is missing or invalid
 * @example
 * throw new InvalidCustomerError("Customer email must be a valid email address");
 */
export class InvalidCustomerError extends OrderDomainError {
  constructor(message: string = "Customer information is invalid") {
    super(message);
  }
}

/**
 * Thrown when attempting to use a duplicate idempotency key
 * @example
 * throw new DuplicateOrderError("An order with this idempotency key already exists");
 */
export class DuplicateOrderError extends OrderDomainError {
  constructor(message: string = "Duplicate order detected") {
    super(message);
  }
}

/**
 * Order Domain Module
 *
 * This module exports the complete Order building and persistence system.
 *
 * @module lib/domain/order
 *
 * @example
 * ```typescript
 * import { OrderBuilder, OrderService } from '@/lib/domain/order';
 *
 * const config = new OrderBuilder()
 *   .setCustomer(customer)
 *   .setShippingAddress(address)
 *   .setPaymentInfo(payment)
 *   .addSubOrder(subOrder)
 *   .setIdempotencyKey(key)
 *   .build();
 *
 * const order = await OrderService.createOrder(config);
 * ```
 */

// Core Classes
export { OrderBuilder } from "./order-builder";
export { OrderRepository } from "../../repositories/order.repository";

// Utilities
export { OrderCalculations } from "./calculations";
export { OrderValidators } from "./validators";

// Error Classes
export {
  OrderDomainError,
  IncompleteOrderError,
  InvalidOrderTotalsError,
  InvalidDiscountError,
  InvalidSubOrderError,
  InvalidProductError,
  InvalidShippingError,
  InvalidOrderStateError,
  TotalCalculationError,
  InvalidPaymentError,
  InvalidAddressError,
  InvalidCustomerError,
  DuplicateOrderError,
} from "./errors";

// Types
export type {
  OrderProductItem,
  ProductSnapshot,
  StoreSnapshot,
  ShippingMethod,
  SubOrderConfig,
  DiscountInfo,
  CustomerInfo,
  ShippingAddressInfo,
  PaymentInfo,
  OrderBuildConfig,
  OrderTotals,
  StatusHistoryEntry,
} from "./types";

import { DeliveryType } from "@/enums";
import {
  InvalidProductError,
  InvalidShippingError,
  InvalidAddressError,
  InvalidCustomerError,
  InvalidSubOrderError,
} from "./errors";
import type {
  OrderProductItem,
  ShippingMethod,
  ShippingAddressInfo,
  CustomerInfo,
} from "./types";

/**
 * Validation utilities for order domain objects
 * Ensures data integrity throughout the order building process
 *
 * @remarks
 * These validators implement business rules and data constraints.
 * Use them before accepting external input or building domain objects.
 */
export class OrderValidators {
  /**
   * Validates a product item for use in an order
   * @param product - Product item to validate
   * @throws {InvalidProductError} if product is invalid
   *
   * @example
   * OrderValidators.validateProduct({
   *   product: { _id: "123", storeId: "store1", name: "Widget", price: 10000, images: [] },
   *   quantity: 2
   * });
   */
  static validateProduct(product: OrderProductItem): void {
    // Validate product object exists
    if (!product || !product.product) {
      throw new InvalidProductError("Product is required");
    }

    const { product: prod, quantity, selectedSize } = product;

    // Validate required fields
    if (!prod._id || typeof prod._id !== "string") {
      throw new InvalidProductError("Product ID must be a non-empty string");
    }

    // if (!prod.storeId || typeof prod.storeId !== "string") {
    //   throw new InvalidProductError("Product store ID must be a non-empty string");
    // }

    if (
      !prod.name ||
      typeof prod.name !== "string" ||
      prod.name.trim() === ""
    ) {
      throw new InvalidProductError("Product name must be a non-empty string");
    }

    if (!Array.isArray(prod.images) || prod.images.length === 0) {
      throw new InvalidProductError("Product must have at least one image URL");
    }

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InvalidProductError("Quantity must be a positive integer");
    }

    if (quantity > 999) {
      throw new InvalidProductError("Quantity cannot exceed 999");
    }

    // Validate price
    const price = selectedSize?.price ?? prod.price;
    if (typeof price !== "number" || price <= 0) {
      throw new InvalidProductError("Product price must be a positive number");
    }

    // Validate selected size if provided
    if (selectedSize) {
      if (!selectedSize.size || typeof selectedSize.size !== "string") {
        throw new InvalidProductError("Selected size name must be a string");
      }

      if (typeof selectedSize.price !== "number" || selectedSize.price <= 0) {
        throw new InvalidProductError("Selected size price must be positive");
      }
    }
  }

  /**
   * Validates a shipping method
   * @param shippingMethod - Shipping method to validate
   * @throws {InvalidShippingError} if shipping method is invalid
   */
  static validateShippingMethod(shippingMethod: ShippingMethod): void {
    if (!shippingMethod) {
      throw new InvalidShippingError("Shipping method is required");
    }

    if (!shippingMethod.name || typeof shippingMethod.name !== "string") {
      throw new InvalidShippingError("Shipping method name must be a string");
    }

    if (typeof shippingMethod.price !== "number" || shippingMethod.price < 0) {
      throw new InvalidShippingError(
        "Shipping price must be a non-negative number",
      );
    }

    // if (
    //   shippingMethod.estimatedDeliveryDays !== undefined &&
    //   (!Number.isInteger(shippingMethod.estimatedDeliveryDays) ||
    //     shippingMethod.estimatedDeliveryDays < 0)
    // ) {
    //   throw new InvalidShippingError(
    //     "Estimated delivery days must be a non-negative integer",
    //   );
    // }
  }

  /**
   * Validates a shipping address
   * @param address - Address to validate
   * @throws {InvalidAddressError} if address is invalid
   */
  static validateShippingAddress(address: ShippingAddressInfo): void {
    if (!address) {
      throw new InvalidAddressError("Address is required");
    }

    // Validate required string fields
    const stringFields = {
      address: address.address,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
    };

    for (const [fieldName, fieldValue] of Object.entries(stringFields)) {
      if (
        !fieldValue ||
        typeof fieldValue !== "string" ||
        fieldValue.trim() === ""
      ) {
        throw new InvalidAddressError(
          `${fieldName} is required and must be a non-empty string`,
        );
      }
    }

    // Validate delivery type
    const validDeliveryTypes = Object.values(DeliveryType);
    if (!validDeliveryTypes.includes(address.deliveryType)) {
      throw new InvalidAddressError(
        `Delivery type must be one of: ${validDeliveryTypes.join(", ")}`,
      );
    }

    // Validate campus-specific fields if delivery type is campus
    // if (address.deliveryType === DeliveryType.Campus) {
    //   if (!address.campusName || typeof address.campusName !== "string") {
    //     throw new InvalidAddressError(
    //       "Campus name is required for campus delivery",
    //     );
    //   }

    //   if (
    //     !address.campusLocation ||
    //     typeof address.campusLocation !== "string"
    //   ) {
    //     throw new InvalidAddressError(
    //       "Campus location is required for campus delivery",
    //     );
    //   }
    // }
  }

  /**
   * Validates customer information
   * @param customer - Customer info to validate
   * @throws {InvalidCustomerError} if customer info is invalid
   */
  static validateCustomer(customer: CustomerInfo): void {
    if (!customer) {
      throw new InvalidCustomerError("Customer information is required");
    }

    // Validate userId
    if (!customer.userId || typeof customer.userId !== "string") {
      throw new InvalidCustomerError(
        "Customer user ID must be a non-empty string",
      );
    }

    // Validate email
    if (!customer.email || typeof customer.email !== "string") {
      throw new InvalidCustomerError("Customer email must be a string");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      throw new InvalidCustomerError(
        "Customer email must be a valid email address",
      );
    }

    // Validate name
    if (
      !customer.name ||
      typeof customer.name !== "string" ||
      customer.name.trim() === ""
    ) {
      throw new InvalidCustomerError(
        "Customer name must be a non-empty string",
      );
    }

    // Validate phone number
    if (!customer.phoneNumber || typeof customer.phoneNumber !== "string") {
      throw new InvalidCustomerError("Customer phone number must be a string");
    }

    // Basic phone number validation (at least 10 digits)
    const phoneDigits = customer.phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      throw new InvalidCustomerError(
        "Customer phone number must contain at least 10 digits",
      );
    }
  }

  /**
   * Validates an idempotency key
   * @param key - Key to validate
   * @throws {InvalidSubOrderError} if key is invalid
   *
   * @remarks
   * Idempotency keys should be UUIDs or similar unique identifiers
   * and must not be empty strings.
   */
  static validateIdempotencyKey(key: string): void {
    if (!key || typeof key !== "string" || key.trim() === "") {
      throw new InvalidSubOrderError(
        "Idempotency key must be a non-empty string",
      );
    }

    if (key.length > 255) {
      throw new InvalidSubOrderError(
        "Idempotency key must not exceed 255 characters",
      );
    }
  }

  /**
   * Validates that sub-order has at least one product
   * @param products - Array of products
   * @throws {InvalidSubOrderError} if no products
   */
  static validateSubOrderHasProducts(products: readonly unknown[]): void {
    if (!Array.isArray(products) || products.length === 0) {
      throw new InvalidSubOrderError(
        "Sub-order must contain at least one product",
      );
    }
  }

  /**
   * Validates store information for sub-order
   * @param storeId - Store ID
   * @param storeName - Store name
   * @throws {InvalidSubOrderError} if invalid
   */
  static validateStoreInfo(storeId: string, storeName: string): void {
    if (!storeId || typeof storeId !== "string") {
      throw new InvalidSubOrderError("Store ID must be a non-empty string");
    }

    if (
      !storeName ||
      typeof storeName !== "string" ||
      storeName.trim() === ""
    ) {
      throw new InvalidSubOrderError("Store name must be a non-empty string");
    }
  }

  /**
   * Validates notes field
   * @param notes - Notes to validate
   * @throws {InvalidSubOrderError} if invalid
   */
  static validateNotes(notes: string): void {
    if (typeof notes !== "string") {
      throw new InvalidSubOrderError("Notes must be a string");
    }

    if (notes.length > 1000) {
      throw new InvalidSubOrderError("Notes must not exceed 1000 characters");
    }
  }
}

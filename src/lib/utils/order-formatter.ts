import type {
  RawOrderDocument,
  FormattedOrder,
  PopulatedProduct,
  PopulatedStore,
} from "@/types/order";

/**
 * Order Data Formatting Utilities
 *
 * These utilities provide type-safe transformation of raw MongoDB documents
 * into properly formatted, client-ready data structures.
 */

/**
 * Type Guard: Check if store is populated
 *
 * Determines whether a store field contains a populated document
 * or just an ObjectId reference.
 *
 * @param store - Store field from MongoDB document
 * @returns True if store is populated with document data
 */
function isPopulatedStore(store: any): store is PopulatedStore {
  return (
    store &&
    typeof store === "object" &&
    "name" in store &&
    "storeEmail" in store
  );
}

/**
 * Type Guard: Check if product is populated
 *
 * Determines whether a product field contains a populated document
 * or just an ObjectId reference.
 *
 * @param product - Product field from MongoDB document
 * @returns True if product is populated with document data
 */
function isPopulatedProduct(product: any): product is PopulatedProduct {
  return (
    product &&
    typeof product === "object" &&
    "name" in product &&
    "price" in product
  );
}

/**
 * Format Single Order Document
 *
 * Transforms a raw MongoDB order document into a properly typed,
 * client-ready format with all ObjectIds converted to strings.
 *
 * @param rawOrder - Raw order document from MongoDB
 * @returns Formatted order with proper typing
 * @throws Error if required populated data is missing
 */
export function formatOrderDocument(
  rawOrder: RawOrderDocument
): FormattedOrder {
  // Validate that the order has the required populated data
  if (!rawOrder.subOrders || rawOrder.subOrders.length === 0) {
    throw new Error(`Order ${rawOrder._id} has no sub-orders`);
  }

  /**
   * Format Sub-Orders with Type Safety
   *
   * Transform each sub-order, ensuring all nested data is properly
   * populated and formatted. Includes comprehensive error handling
   * for missing or invalid data.
   */
  const formattedSubOrders = rawOrder.subOrders.map((subOrder, index) => {
    // Validate store population
    if (!isPopulatedStore(subOrder.store)) {
      throw new Error(
        `Sub-order ${index} in order ${rawOrder._id} has unpopulated store`
      );
    }

    // Format products with validation
    const formattedProducts = subOrder.products.map(
      (productItem, productIndex) => {
        // Validate product population
        if (!isPopulatedProduct(productItem.Product)) {
          throw new Error(
            `Product ${productIndex} in sub-order ${index} of order ${rawOrder._id} has unpopulated Product`
          );
        }

        return {
          _id: productItem._id.toString(),
          Product: {
            _id: productItem.Product._id,
            name: productItem.Product.name,
            images: productItem.Product.images,
            price: productItem.Product.price,
            productType: productItem.Product.productType,
            storeID: productItem.Product.storeID,
          },
          store: productItem.store.toString(),
          quantity: productItem.quantity,
          price: productItem.price,
          selectedSize: productItem.selectedSize,
        };
      }
    );

    return {
      _id: subOrder._id.toString(),
      store: {
        _id: subOrder.store._id,
        name: subOrder.store.name,
        storeEmail: subOrder.store.storeEmail,
        logoUrl: subOrder.store.logoUrl,
      },
      products: formattedProducts,
      totalAmount: subOrder.totalAmount,
      deliveryStatus:
        subOrder.deliveryStatus as FormattedOrder["subOrders"][0]["deliveryStatus"],
      shippingMethod: subOrder.shippingMethod,
      trackingNumber: subOrder.trackingNumber,
      deliveryDate: subOrder.deliveryDate,
      escrow: subOrder.escrow,
      returnWindow: subOrder.returnWindow,
    };
  });

  /**
   * Return Formatted Order
   *
   * Construct the final formatted order with all ObjectIds converted
   * to strings and proper type safety maintained throughout.
   */
  return {
    _id: rawOrder._id.toString(),
    user: rawOrder.user.toString(),
    stores: rawOrder.stores.map((storeId) => storeId.toString()),
    totalAmount: rawOrder.totalAmount,
    paymentStatus: rawOrder.paymentStatus,
    paymentMethod: rawOrder.paymentMethod,
    shippingAddress: rawOrder.shippingAddress,
    notes: rawOrder.notes,
    discount: rawOrder.discount,
    taxAmount: rawOrder.taxAmount,
    createdAt: rawOrder.createdAt,
    updatedAt: rawOrder.updatedAt,
    subOrders: formattedSubOrders,
  };
}

/**
 * Format Multiple Order Documents
 *
 * Efficiently processes an array of raw order documents,
 * applying proper formatting and error handling to each.
 *
 * @param rawOrders - Array of raw order documents from MongoDB
 * @returns Array of formatted orders
 */
export function formatOrderDocuments(
  rawOrders: RawOrderDocument[]
): FormattedOrder[] {
  return rawOrders.map((order, index) => {
    try {
      return formatOrderDocument(order);
    } catch (error) {
      console.error(`Failed to format order at index ${index}:`, error);
      throw new Error(
        `Order formatting failed for order ${order._id}: ${error}`
      );
    }
  });
}

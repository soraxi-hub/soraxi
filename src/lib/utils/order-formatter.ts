import type {
  RawOrderDocument,
  FormattedOrder,
  PopulatedStore,
  PopulatedUser,
  FormattedOrderForAdmin,
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

// /**
//  * Type Guard: Check if product is populated
//  *
//  * Determines whether a product field contains a populated document
//  * or just an ObjectId reference.
//  *
//  * @param product - Product field from MongoDB document
//  * @returns True if product is populated with document data
//  */
// function isPopulatedProduct(product: any): product is PopulatedProduct {
//   return (
//     product &&
//     typeof product === "object" &&
//     "name" in product &&
//     "price" in product
//   );
// }

/**
 * Type Guard: Checks if a user field is populated
 *
 * This function verifies whether the `user` field is a populated user object
 * rather than just a MongoDB ObjectId. It helps ensure that fields like
 * `firstName`, `lastName`, and `email` are available before accessing them.
 *
 * Usage:
 *   if (isPopulatedUser(order.user)) {
 *     // Safe to access user.firstName, etc.
 *   }
 */
export function isPopulatedUser(user: any): user is PopulatedUser {
  return (
    user &&
    typeof user === "object" &&
    "firstName" in user &&
    "lastName" in user &&
    "email" in user
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
    if (!isPopulatedStore(subOrder.storeId)) {
      throw new Error(
        `Sub-order ${index} in order ${rawOrder._id} has unpopulated store`
      );
    }

    // Format products with validation
    const formattedProducts = subOrder.products.map(
      (productItem, _productIndex) => {
        // Validate product population
        // if (!isPopulatedProduct(productItem.Product)) {
        //   throw new Error(
        //     `Product ${productIndex} in sub-order ${index} of order ${rawOrder._id} has unpopulated Product`
        //   );
        // }

        return {
          _id: productItem._id.toString(),
          // Product: {
          //   _id: productItem.Product._id,
          //   name: productItem.Product.name,
          //   images: productItem.Product.images,
          //   price: productItem.Product.price,
          //   productType: productItem.Product.productType,
          //   storeId: productItem.Product.storeID,
          // }, // Commented out to reduce data exposure and a more reliable source of truth for display is the productSnapshot & storeSnapshot. I am still keeping this commented out for reference purposes only.
          storeId: productItem.storeId.toString(),
          productSnapshot: {
            _id: productItem.productSnapshot._id.toString(),
            name: productItem.productSnapshot.name,
            images: productItem.productSnapshot.images,
            quantity: productItem.productSnapshot.quantity,
            price: productItem.productSnapshot.price,
            category: productItem.productSnapshot.category,
            subCategory: productItem.productSnapshot.subCategory,
            selectedSize: productItem.productSnapshot.selectedSize,
          },
          storeSnapshot: {
            _id: productItem.storeSnapshot._id.toString(),
            name: productItem.storeSnapshot.name,
            logo: productItem.storeSnapshot.logo,
            email: productItem.storeSnapshot.email,
          },
        };
      }
    );

    return {
      _id: subOrder._id.toString(),
      store: {
        _id: subOrder.storeId._id,
        name: subOrder.storeId.name,
        storeEmail: subOrder.storeId.storeEmail,
        logoUrl: subOrder.storeId.logoUrl,
      },
      products: formattedProducts,
      totalAmount: subOrder.totalAmount,
      deliveryStatus:
        subOrder.deliveryStatus as FormattedOrder["subOrders"][0]["deliveryStatus"],
      shippingMethod: subOrder.shippingMethod,
      deliveryDate: subOrder.deliveryDate,
      customerConfirmedDelivery: subOrder.customerConfirmedDelivery,
      statusHistory: subOrder.statusHistory.map((statusItem) => ({
        status: statusItem.status,
        timestamp: statusItem.timestamp,
        notes: statusItem.notes,
      })),
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
    user: rawOrder.userId.toString(),
    stores: rawOrder.stores.map((storeId) => storeId.toString()),
    totalAmount: rawOrder.totalAmount,
    paymentStatus: rawOrder.paymentStatus,
    paymentMethod: rawOrder.paymentMethod,
    shippingAddress: rawOrder.shippingAddress,
    notes: rawOrder.notes,
    createdAt: rawOrder.createdAt,
    updatedAt: rawOrder.updatedAt,
    subOrders: formattedSubOrders,
  };
}

/**
 * Format Single Order Document For Admin Page(s)
 *
 * Transforms a raw MongoDB order document into a properly typed,
 * client-ready format with all ObjectIds converted to strings.
 * Provides a simplified view optimized for admin interfaces.
 *
 * @param rawOrder - Raw order document from MongoDB
 * @returns Formatted order with proper typing
 * @throws Error if required populated data is missing
 */
export function formatOrderDocumentForAdmins(
  rawOrder: RawOrderDocument
): FormattedOrderForAdmin {
  // Validate that the order has the required populated data
  if (!rawOrder.stores || rawOrder.stores.length === 0) {
    throw new Error(`Order ${rawOrder._id} has no stores`);
  }

  if (!rawOrder.subOrders || rawOrder.subOrders.length === 0) {
    throw new Error(`Order ${rawOrder._id} has no sub-orders`);
  }

  /**
   * Generate Order Number
   *
   * Creates a human-readable order number from the MongoDB ObjectId
   */
  const orderNumber = `ORD-${rawOrder._id
    .toString()
    .substring(0, 8)
    .toUpperCase()}`;

  /**
   * Format Customer Information
   *
   * Extracts and formats customer details with fallbacks for missing data
   */
  const customer = {
    id: rawOrder.userId?._id?.toString() || "",
    name: rawOrder.userId
      ? `${(rawOrder.userId as PopulatedUser).firstName} ${
          (rawOrder.userId as PopulatedUser).lastName
        }`
      : "Unknown Customer",
    email: (rawOrder.userId as PopulatedUser).email || "",
  };

  /**
   * Format Store Information
   *
   * Extracts primary store details with fallbacks for missing data
   */
  const primaryStore =
    rawOrder.stores && rawOrder.stores.length > 0 ? rawOrder.stores[0] : null;
  const store = {
    id: primaryStore?._id?.toString() || "",
    name: (primaryStore as PopulatedStore)?.name || "Unknown Store",
    email: (primaryStore as PopulatedStore)?.storeEmail || "",
  };

  /**
   * Format Order Items
   *
   * Flattens all products from sub-orders into a single items array
   * with essential product information
   */
  const items = rawOrder.subOrders.flatMap((subOrder) =>
    subOrder.products.map((product) => ({
      id: product.productId?._id?.toString() || "",
      productSnapshot: {
        _id: product.productSnapshot._id.toString(),
        name: product.productSnapshot.name,
        images: product.productSnapshot.images,
        quantity: product.productSnapshot.quantity,
        price: product.productSnapshot.price,
        category: product.productSnapshot.category,
        subCategory: product.productSnapshot.subCategory,
        selectedSize: product.productSnapshot.selectedSize,
      },
      storeSnapshot: {
        _id: product.storeSnapshot._id.toString(),
        name: product.storeSnapshot.name,
        logo: product.storeSnapshot.logo,
        email: product.storeSnapshot.email,
      },
      // name: (product.Product as PopulatedProduct)?.name || "Unknown Product",
      // price: product.price,
      // quantity: product.quantity,
      // image: (product.Product as PopulatedProduct)?.images?.[0],
    }))
  );

  /**
   * Determine Overall Order Status
   *
   * Calculates the "worst" status across all sub-orders to represent
   * the overall order status for admin views
   */
  // const statusPriority = {
  //   Canceled: 1,
  //   Refunded: 2,
  //   "Failed Delivery": 3,
  //   Returned: 4,
  //   "Order Placed": 5,
  //   Processing: 6,
  //   Shipped: 7,
  //   "Out for Delivery": 8,
  //   Delivered: 9,
  // };

  // let overallStatus = "Order Placed";
  // if (rawOrder.subOrders && rawOrder.subOrders.length > 0) {
  //   overallStatus = rawOrder.subOrders.reduce((worst, subOrder) => {
  //     const currentPriority =
  //       statusPriority[
  //         subOrder.deliveryStatus as keyof typeof statusPriority
  //       ] || 5;
  //     const worstPriority =
  //       statusPriority[worst as keyof typeof statusPriority] || 5;
  //     return currentPriority < worstPriority ? subOrder.deliveryStatus : worst;
  //   }, "Order Placed");
  // }

  /**
   * Return Formatted Admin Order
   *
   * Constructs the final simplified order format optimized for admin interfaces
   * with all essential information and proper type safety
   */
  return {
    id: rawOrder._id.toString(),
    orderNumber,
    customer,
    store,
    items,
    // status: overallStatus,
    paymentStatus: rawOrder.paymentStatus || "pending",
    totalAmount: rawOrder.totalAmount,
    shippingAddress: rawOrder.shippingAddress,
    createdAt: rawOrder.createdAt,
    updatedAt: rawOrder.updatedAt,
    notes: rawOrder.notes,
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

export function formatStoreOrderDocument(
  rawOrder: RawOrderDocument,
  storeId: string
): FormattedOrder {
  const storeSubOrders = rawOrder.subOrders.filter(
    (subOrder) => subOrder.storeId?._id?.toString() === storeId
  );

  if (storeSubOrders.length === 0) {
    throw new Error(
      `Order ${rawOrder._id} has no sub-orders for store ${storeId}`
    );
  }

  const formattedSubOrders = storeSubOrders.map((subOrder, index) => {
    if (!isPopulatedStore(subOrder.storeId)) {
      throw new Error(
        `Sub-order ${index} in order ${rawOrder._id} has unpopulated store`
      );
    }

    const formattedProducts = subOrder.products.map(
      (productItem, _productIndex) => {
        // if (!isPopulatedProduct(productItem.Product)) {
        //   throw new Error(
        //     `Product ${productIndex} in sub-order ${index} of order ${rawOrder._id} has unpopulated Product`
        //   );
        // }

        return {
          _id: productItem._id.toString(),
          // Product: {
          //   _id: productItem.Product._id,
          //   name: productItem.Product.name,
          //   images: productItem.Product.images,
          //   price: productItem.Product.price,
          //   productType: productItem.Product.productType,
          //   storeId: productItem.Product.storeID,
          // },
          storeId: productItem.storeId.toString(),
          productSnapshot: {
            _id: productItem.productSnapshot._id.toString(),
            name: productItem.productSnapshot.name,
            images: productItem.productSnapshot.images,
            quantity: productItem.productSnapshot.quantity,
            price: productItem.productSnapshot.price,
            category: productItem.productSnapshot.category,
            subCategory: productItem.productSnapshot.subCategory,
            selectedSize: productItem.productSnapshot.selectedSize,
          },
          storeSnapshot: {
            _id: productItem.storeSnapshot._id.toString(),
            name: productItem.storeSnapshot.name,
            logo: productItem.storeSnapshot.logo,
            email: productItem.storeSnapshot.email,
          },
        };
      }
    );

    return {
      _id: subOrder._id?.toString() || "",
      store: {
        _id: subOrder.storeId._id,
        name: subOrder.storeId.name,
        storeEmail: subOrder.storeId.storeEmail,
        logoUrl: subOrder.storeId.logoUrl,
      },
      products: formattedProducts,
      totalAmount: subOrder.totalAmount,
      deliveryStatus:
        subOrder.deliveryStatus as FormattedOrder["subOrders"][0]["deliveryStatus"],
      shippingMethod: subOrder.shippingMethod,
      deliveryDate: subOrder.deliveryDate,
      customerConfirmedDelivery: subOrder.customerConfirmedDelivery,
      statusHistory: subOrder.statusHistory.map((statusItem) => ({
        status: statusItem.status,
        timestamp: statusItem.timestamp,
        notes: statusItem.notes,
      })),
    };
  });

  // ✅ Validate populated user
  if (!isPopulatedUser(rawOrder.userId)) {
    throw new Error(`Order ${rawOrder._id} has unpopulated user`);
  }

  // ✅ Handle populated user safely
  const user = {
    _id: rawOrder.userId._id.toString(),
    firstName: rawOrder.userId.firstName,
    lastName: rawOrder.userId.lastName,
    email: rawOrder.userId.email,
    phoneNumber: rawOrder.userId.phoneNumber || "Unknown",
  };

  return {
    _id: rawOrder._id.toString(),
    user,
    stores: [storeId],
    totalAmount: formattedSubOrders.reduce((sum, s) => sum + s.totalAmount, 0),
    paymentStatus: rawOrder.paymentStatus,
    paymentMethod: rawOrder.paymentMethod,
    shippingAddress: rawOrder.shippingAddress,
    notes: rawOrder.notes,
    createdAt: rawOrder.createdAt,
    updatedAt: rawOrder.updatedAt,
    subOrders: formattedSubOrders,
  };
}

export function formatOrderDocumentsForAdmins(
  rawOrders: RawOrderDocument[]
): FormattedOrderForAdmin[] {
  return rawOrders.map((order, index) => {
    try {
      return formatOrderDocumentForAdmins(order);
    } catch (error) {
      console.error(`Failed to format order at index ${index}:`, error);
      throw new Error(
        `Order formatting failed for order ${order._id}: ${error}`
      );
    }
  });
}

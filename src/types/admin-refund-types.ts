import { DeliveryStatus } from "@/enums";
import { z } from "zod";

/**
 * Zod schema for a product within a refund queue item.
 */
export const RefundProductSchema = z.object({
  id: z.string(),
  quantity: z.number(),
  price: z.number(),
  selectedSize: z
    .object({
      size: z.string(),
      price: z.number(),
    })
    .optional(),
});

/**
 * Zod schema for the customer details in a refund queue item.
 */
export const RefundCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

/**
 * Zod schema for the store details in a refund queue item.
 */
export const RefundStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

/**
 * Zod schema for the escrow details in a refund queue item.
 */
export const RefundEscrowSchema = z.object({
  held: z.boolean(),
  released: z.boolean(),
  releasedAt: z.string().datetime().optional(), // Assuming it's ISO string or similar
  refunded: z.boolean(),
  refundReason: z.string(),
});

/**
 * Zod schema for the shipping method details in a refund queue item.
 */
export const RefundShippingMethodSchema = z
  .object({
    name: z.string(),
    price: z.number(),
    estimatedDeliveryDays: z.string().optional(),
    description: z.string().optional(),
  })
  .optional();

/**
 * Zod schema for a single item in the refund queue.
 */
export const RefundQueueItemSchema = z.object({
  id: z.string(), // Sub-order ID
  orderNumber: z.string(), // Formatted main order number
  subOrderId: z.string(), // Sub-order ID
  customer: RefundCustomerSchema,
  store: RefundStoreSchema,
  products: z.array(RefundProductSchema),
  totalAmount: z.number(), // Total amount of the sub-order
  deliveryStatus: z.nativeEnum(DeliveryStatus),
  escrow: RefundEscrowSchema,
  shippingMethod: RefundShippingMethodSchema,
  refundRequestDate: z.string().datetime(), // Date when the order was marked for refund
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  orderTotalAmount: z.number(), // Total amount of the main order
  shippingAddress: z
    .object({
      postalCode: z.string(),
      address: z.string(),
    })
    .optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
});

/**
 * Zod schema for pagination metadata.
 */
export const RefundPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

/**
 * Zod schema for the filters applied to the refund queue.
 */
export const RefundFiltersSchema = z.object({
  fromDate: z.string().datetime().nullable(),
  toDate: z.string().datetime().nullable(),
  deliveryStatus: z.enum(["Canceled", "Returned", "Failed Delivery", "all"]),
  search: z.string(),
});

/**
 * Zod schema for the summary statistics of the refund queue.
 */
export const RefundSummarySchema = z.object({
  totalPendingRefunds: z.number(),
  totalRefundAmount: z.number(),
});

/**
 * Zod schema for the complete output of the getRefundQueue procedure.
 */
export const GetRefundQueueOutputSchema = z.object({
  success: z.boolean(),
  refundQueue: z.array(RefundQueueItemSchema),
  pagination: RefundPaginationSchema,
  filters: RefundFiltersSchema,
  summary: RefundSummarySchema,
});

/**
 * Zod schema for a product within the detailed refund item.
 */
export const RefundDetailProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  images: z.array(z.string()),
  price: z.number(),
  quantity: z.number(),
  selectedSize: z
    .object({
      size: z.string(),
      price: z.number(),
    })
    .optional(),
  category: z.array(z.string()),
  subCategory: z.array(z.string()),
  productType: z.string(),
  totalPrice: z.number(),
});

/**
 * Zod schema for the customer details in a detailed refund item.
 */
export const RefundDetailCustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
});

/**
 * Zod schema for the store details in a detailed refund item.
 */
export const RefundDetailStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  description: z.string(),
});

/**
 * Zod schema for the detailed refund item output.
 */
export const RefundItemDetailSchema = z.object({
  id: z.string(), // Main order ID
  orderNumber: z.string(),
  subOrderId: z.string(),
  customer: RefundDetailCustomerSchema,
  store: RefundDetailStoreSchema,
  products: z.array(RefundDetailProductSchema),
  subOrderAmount: z.number(),
  orderTotalAmount: z.number(),
  discount: z.number(),
  taxAmount: z.number(),
  deliveryStatus: z.nativeEnum(DeliveryStatus),
  deliveryDate: z.string().datetime().optional().nullable(),
  customerConfirmedDelivery: z.object({
    confirmed: z.boolean(),
    confirmedAt: z.string().datetime().optional().nullable(),
    autoConfirmed: z.boolean(),
  }),
  returnWindow: z.string().datetime().optional().nullable(),
  escrow: RefundEscrowSchema,
  shippingMethod: RefundShippingMethodSchema,
  shippingAddress: z
    .object({
      postalCode: z.string(),
      address: z.string(),
    })
    .optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  refundRequestDate: z.string().datetime(),
});

/**
 * Zod schema for the complete output of the getRefundItemDetail procedure.
 */
export const GetRefundItemDetailOutputSchema = z.object({
  success: z.boolean(),
  refundItem: RefundItemDetailSchema,
});

export type FormattedRefundQueueItem = z.infer<typeof RefundQueueItemSchema>;
export type GetRefundQueueOutput = z.infer<typeof GetRefundQueueOutputSchema>;
export type FormattedRefundItemDetail = z.infer<typeof RefundItemDetailSchema>;
export type GetRefundItemDetailOutput = z.infer<
  typeof GetRefundItemDetailOutputSchema
>;

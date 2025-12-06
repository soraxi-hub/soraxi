import { DeliveryStatus, DeliveryStatusLabel } from "@/enums";

// All possible delivery statuses
export const allStatuses = [
  DeliveryStatus.Processing,
  DeliveryStatus.Shipped,
  DeliveryStatus.OutForDelivery,
  DeliveryStatus.Delivered,
  DeliveryStatus.Canceled,
  DeliveryStatus.FailedDelivery,
];

// Valid transitions from each current status
export const allowedNextStatuses: Record<
  DeliveryStatusLabel,
  DeliveryStatus[]
> = {
  [DeliveryStatus.OrderPlaced]: [
    DeliveryStatus.Processing,
    DeliveryStatus.Canceled,
  ],
  [DeliveryStatus.Processing]: [
    DeliveryStatus.Shipped,
    DeliveryStatus.Canceled,
  ],
  [DeliveryStatus.Shipped]: [DeliveryStatus.OutForDelivery],
  [DeliveryStatus.OutForDelivery]: [
    DeliveryStatus.Delivered,
    DeliveryStatus.FailedDelivery,
  ],
  [DeliveryStatus.FailedDelivery]: [DeliveryStatus.Delivered], // if seller reattempts delivery
};

/**
 * This file is used by the order details page
 */

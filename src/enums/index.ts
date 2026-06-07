/**
 * Enum representing the various payment statuses for an order.
 */
export enum PaymentStatus {
  Pending = "pending",
  Paid = "paid",
  Failed = "failed",
  Refunded = "refunded",
  Cancelled = "cancelled",
}

export enum CouponTypeEnum {
  Percentage = "percentage",
  Fixed = "fixed",
}

export enum TokenType {
  User = "userToken",
  Store = "storeToken",
  Admin = "adminToken",
}

/**
 * Enum representing the supported payment gateways.
 */
export enum PaymentGateway {
  Paystack = "paystack",
  Flutterwave = "flutterwave",
}

/**
 * Enum representing the supported delivery types.
 */
export enum DeliveryType {
  Campus = "campus",
  OffCampus = "off-campus",
}

/**
 * Enum representing the various status history entries for a sub-order.
 * Updating this enum means you should also update the StatusHistory enum.
 */
export enum DeliveryStatus {
  OrderPlaced = "order_placed",
  Processing = "processing",
  Shipped = "shipped",
  OutForDelivery = "out_for_delivery",
  Delivered = "delivered",
  Canceled = "canceled",
  Returned = "returned",
  FailedDelivery = "failed_delivery",
  Refunded = "refunded",
}

/**
 * Enum representing the various status history entries for an order.
 * Note: This is similar to DeliveryStatus but kept separate for clarity and potential future differences.
 * Updating DeliveryStatus enums means you should also update this enum.
 */
export enum StatusHistory {
  OrderPlaced = "order_placed",
  Processing = "processing",
  Shipped = "shipped",
  Delivered = "delivered",
  Canceled = "canceled",
  Returned = "returned",
  Refunded = "refunded",
  OutForDelivery = "out_for_delivery",
  FailedDelivery = "failed_delivery",
  ReturnRequested = "return_requested",
}

// Mapping of status history enum to user-friendly labels
export const statusHistoryLabels: Record<StatusHistory, string> = {
  [StatusHistory.OrderPlaced]: "Order Placed",
  [StatusHistory.Processing]: "Processing",
  [StatusHistory.Shipped]: "Shipped",
  [StatusHistory.OutForDelivery]: "Out for Delivery",
  [StatusHistory.Delivered]: "Delivered",
  [StatusHistory.Canceled]: "Canceled",
  [StatusHistory.Returned]: "Returned",
  [StatusHistory.FailedDelivery]: "Failed Delivery",
  [StatusHistory.Refunded]: "Refunded",
  [StatusHistory.ReturnRequested]: "Return Requested",
} as const satisfies Record<StatusHistory, string>;

export type StatusHistoryLabel = (typeof statusHistoryLabels)[StatusHistory];

export const statusHistoryLabel = (val: StatusHistory): StatusHistoryLabel => {
  switch (val) {
    case StatusHistory.OrderPlaced:
      return statusHistoryLabels[StatusHistory.OrderPlaced];
    case StatusHistory.Processing:
      return statusHistoryLabels[StatusHistory.Processing];
    case StatusHistory.Shipped:
      return statusHistoryLabels[StatusHistory.Shipped];
    case StatusHistory.OutForDelivery:
      return statusHistoryLabels[StatusHistory.OutForDelivery];
    case StatusHistory.Delivered:
      return statusHistoryLabels[StatusHistory.Delivered];
    case StatusHistory.Canceled:
      return statusHistoryLabels[StatusHistory.Canceled];
    case StatusHistory.Returned:
      return statusHistoryLabels[StatusHistory.Returned];
    case StatusHistory.ReturnRequested:
      return statusHistoryLabels[StatusHistory.ReturnRequested];
    case StatusHistory.FailedDelivery:
      return statusHistoryLabels[StatusHistory.FailedDelivery];
    case StatusHistory.Refunded:
      return statusHistoryLabels[StatusHistory.Refunded];
    default:
      return "Unknown Status";
  }
};

// Mapping of status history enum to user-friendly labels
export const deliveryStatusLabels: Record<DeliveryStatus, string> = {
  [DeliveryStatus.OrderPlaced]: "Order Placed",
  [DeliveryStatus.Processing]: "Processing",
  [DeliveryStatus.Shipped]: "Shipped",
  [DeliveryStatus.OutForDelivery]: "Out for Delivery",
  [DeliveryStatus.Delivered]: "Delivered",
  [DeliveryStatus.Canceled]: "Canceled",
  [DeliveryStatus.Returned]: "Returned",
  [DeliveryStatus.FailedDelivery]: "Failed Delivery",
  [DeliveryStatus.Refunded]: "Refunded",
} as const satisfies Record<DeliveryStatus, string>;

export type DeliveryStatusLabel = (typeof deliveryStatusLabels)[DeliveryStatus];

export const deliveryStatusLabel = (
  val: DeliveryStatus,
): DeliveryStatusLabel => {
  switch (val) {
    case DeliveryStatus.OrderPlaced:
      return deliveryStatusLabels[DeliveryStatus.OrderPlaced];
    case DeliveryStatus.Processing:
      return deliveryStatusLabels[DeliveryStatus.Processing];
    case DeliveryStatus.Shipped:
      return deliveryStatusLabels[DeliveryStatus.Shipped];
    case DeliveryStatus.OutForDelivery:
      return deliveryStatusLabels[DeliveryStatus.OutForDelivery];
    case DeliveryStatus.Delivered:
      return deliveryStatusLabels[DeliveryStatus.Delivered];
    case DeliveryStatus.Canceled:
      return deliveryStatusLabels[DeliveryStatus.Canceled];
    case DeliveryStatus.Returned:
      return deliveryStatusLabels[DeliveryStatus.Returned];
    case DeliveryStatus.FailedDelivery:
      return deliveryStatusLabels[DeliveryStatus.FailedDelivery];
    case DeliveryStatus.Refunded:
      return deliveryStatusLabels[DeliveryStatus.Refunded];
    default:
      return "Unknown Status";
  }
};

/**
 * Enum for OTP purpose
 * Helps differentiate OTP usage (e.g., verification vs password reset)
 */
export enum OtpPurpose {
  VerifyEmail = "verify_email",
  ResetPassword = "reset_password",
  Login = "login",
}

export enum OtpEntityType {
  User = "user",
  Store = "store",
  Admin = "admin",
}

/**
 * Enum for Product Status
 */
export enum ProductStatusEnum {
  Draft = "draft",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Archived = "archived",
}

export enum ProductActionEnum {
  Draft = "draft",
  Publish = "publish",
}

export enum ProductTypeEnum {
  Product = "Product", // Keep it like this for proper DB reference to the Product Schema
}

/**
 * Status of a request post.
 * - Open: Request is active and still looking for responses
 * - Fulfilled: User has found what they were looking for
 * - Expired: Request is no longer valid (auto or manual expiry)
 */
export enum RequestStatus {
  Open = "open",
  Fulfilled = "fulfilled",
  Expired = "expired",
}

export enum StoreStatusEnum {
  Active = "active",
  Suspended = "suspended",
  Pending = "pending",
  Rejected = "rejected",
}

export enum StoreVerificationStatusEnum {
  Email = "email",
  Identity = "identity",
  videoCall = "video_call",
}

export enum StoreBusinessInfoEnum {
  Individual = "individual",
  Company = "company",
}

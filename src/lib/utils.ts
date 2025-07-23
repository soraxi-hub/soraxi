import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Package, Truck, Clock, CheckCircle, AlertCircle } from "lucide-react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusClassName = (status: string) => {
  switch (status) {
    case "Order Placed":
      return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    case "Processing":
      return "bg-muted text-muted-foreground hover:bg-muted/80";
    case "Shipped":
      return "bg-blue-500 text-white hover:bg-blue-600";
    case "Out for Delivery":
      return "bg-amber-500 text-white hover:bg-amber-600";
    case "Delivered":
      return "bg-green-500 text-white hover:bg-green-600";
    case "Canceled":
      return "bg-destructive text-destructive-foreground hover:bg-destructive/80";
    case "Returned":
      return "bg-red-500 text-white hover:bg-red-600";
    case "Failed Delivery":
      return "bg-red-500 text-white hover:bg-red-600";
    case "Refunded":
      return "bg-yellow-500 text-white hover:bg-yellow-600";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted/80";
  }
};

/**
 * Data Serialization Utility
 *
 * Safely serializes complex objects by removing circular references,
 * converting non-serializable data, and ensuring clean data transfer
 * between server and client components.
 *
 * This prevents "Maximum call stack size exceeded" errors that occur
 * when Next.js tries to serialize MongoDB documents or other complex objects.
 *
 * @param data - The data object to serialize
 * @returns Clean, serializable version of the data
 */
export function serializeData<T>(data: T): T {
  try {
    // Use JSON.parse(JSON.stringify()) to remove circular references
    // and convert non-serializable data like Dates, ObjectIds, etc.
    return JSON.parse(JSON.stringify(data));
  } catch (error) {
    console.error("Data serialization failed:", error);
    // Return a safe fallback if serialization fails
    return {} as T;
  }
}

/**
 * Get Status Badge Configuration
 *
 * Returns appropriate styling and icon configuration for different
 * delivery statuses with enhanced visual indicators.
 *
 * @param status - The delivery status to get configuration for
 * @returns Object containing variant, icon, and color information
 */
export const getStatusBadge = (status: string) => {
  const statusConfig = {
    "Order Placed": {
      variant: "secondary" as const,
      icon: Clock,
      color: "bg-blue-100 text-blue-800",
    },
    Processing: {
      variant: "default" as const,
      icon: Package,
      color: "bg-orange-100 text-orange-800",
    },
    Shipped: {
      variant: "default" as const,
      icon: Truck,
      color: "bg-purple-100 text-purple-800",
    },
    "Out for Delivery": {
      variant: "default" as const,
      icon: Truck,
      color: "bg-indigo-100 text-indigo-800",
    },
    Delivered: {
      variant: "default" as const,
      icon: CheckCircle,
      color: "bg-green-100 text-green-800",
    },
    Canceled: {
      variant: "destructive" as const,
      icon: AlertCircle,
      color: "bg-red-100 text-red-800",
    },
    Returned: {
      variant: "secondary" as const,
      icon: AlertCircle,
      color: "bg-yellow-100 text-yellow-800",
    },
    "Failed Delivery": {
      variant: "destructive" as const,
      icon: AlertCircle,
      color: "bg-red-100 text-red-800",
    },
    Refunded: {
      variant: "secondary" as const,
      icon: AlertCircle,
      color: "bg-gray-100 text-gray-800",
    },
  };

  return (
    statusConfig[status as keyof typeof statusConfig] ||
    statusConfig["Order Placed"]
  );
};

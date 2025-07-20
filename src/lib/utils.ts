import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

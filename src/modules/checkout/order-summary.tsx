"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { Loader2, LockIcon } from "lucide-react";
import { DeliveryType } from "@/enums";
import { CouponInput } from "./coupon-input";
import { toast } from "sonner";
import { CouponTypeEnum } from "@/enums";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import { ShippingInformationSection } from "./shipping-information-section";

export const campusLocations = [
  "Main Gate",
  "Unical Library (E-Library)",
  "Hostel Area",
];

/**
 * Type definitions for checkout data structures
 */
type Coupon = {
  code: string;
  discount: number;
  type: CouponTypeEnum;
  value: number;
};

interface OrderSummaryProps {
  subtotal: number;
  discount?: number;
  shippingCost: number;
  totalItems: number;
  onPlaceOrderAction: () => void;
  setAppliedCoupon: (val: Coupon) => void;
  userData: PublicToJSONUserType;
  isComplete: boolean;
  isValidating: boolean;
  isProcessing: boolean;
  deliveryType: DeliveryType;
  handleDeliveryTypeChangeAction: (val: DeliveryType) => void;
}

/** Displays order summary and checkout controls */
export default function OrderSummary({
  subtotal,
  discount,
  shippingCost,
  totalItems,
  onPlaceOrderAction,
  userData,
  isComplete,
  isValidating,
  isProcessing,
  deliveryType,
  handleDeliveryTypeChangeAction,
  setAppliedCoupon,
}: OrderSummaryProps) {
  /**
   * Order Total Calculation
   *
   * Calculate the final order total including all costs.
   * This calculation is also performed server-side for security.
   */
  const discountedSubtotal = currencyOperations.subtract(
    subtotal,
    discount || 0,
  );
  const total = currencyOperations.add(discountedSubtotal, shippingCost);

  /**
   * Loading State Management
   *
   * Determine overall loading state and appropriate button text
   * to provide clear feedback to users during different operations.
   */
  const isLoading = isValidating || isProcessing;
  const buttonText = isValidating
    ? "Validating Cart..."
    : isProcessing
      ? "Processing Payment..."
      : `Place Order • ${formatNaira(total)}`;

  return (
    <Card className="sticky top-6 border-soraxi-green/30 shadow-lg">
      {/* Shipping Information Section */}
      <ShippingInformationSection
        userData={userData}
        deliveryType={deliveryType}
        handleDeliveryTypeChangeAction={handleDeliveryTypeChangeAction}
      />

      {/* Order Summary Section */}
      <CardHeader className="pt-0 pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Order Summary</span>
          <Badge variant="secondary" className="text-xs">
            {totalItems} item{totalItems > 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">
            Subtotal ({totalItems} item{totalItems > 1 ? "s" : ""})
          </span>
          <span className="font-medium">{formatNaira(discountedSubtotal)}</span>
        </div>

        {discount && discount > 0 && (
          <div className="flex justify-between items-center text-soraxi-green">
            <span>Discount</span>
            <span>-{formatNaira(discount)} off</span>
          </div>
        )}

        {/* Shipping Cost */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium">
            {shippingCost === 0
              ? formatNaira(shippingCost)
              : formatNaira(shippingCost)}
          </span>
        </div>

        <Separator className="border-soraxi-green/30" />

        {/* Order Total */}
        <div className="flex justify-between items-center text-lg font-semibold">
          <span>Total</span>
          <span className="text-soraxi-green">{formatNaira(total)}</span>
        </div>

        {/* Order Status Messages */}
        {!isComplete && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start space-x-2">
              <p className="text-sm text-amber-800">
                Please select shipping methods for all stores to continue.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Place Order Button */}
      <CardFooter className="flex flex-col space-y-4">
        <CouponInput
          orderTotal={subtotal + shippingCost}
          storeIds={[]} // or whatever represents store IDs
          onCouponApplied={(coupon) => {
            setAppliedCoupon(coupon);
            toast.success(`${coupon.code} applied!`);
          }}
        />

        <Button
          className="w-full bg-soraxi-green text-white hover:bg-soraxi-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          size="lg"
          onClick={onPlaceOrderAction}
          disabled={!isComplete || isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {buttonText}
        </Button>

        {/* Security Badge */}
        <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground">
          <LockIcon className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
          Secure checkout powered by Flutterwave
        </div>
      </CardFooter>
    </Card>
  );
}

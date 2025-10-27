"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils/naira";
import {
  Loader2,
  MapPin,
  AlertTriangle,
  LockIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InfoIcon } from "lucide-react";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { DeliveryType } from "@/enums";
// import { CouponInput } from "./coupon-input";
// import { toast } from "sonner";

export const campusLocations = [
  "Main Gate",
  "Unical Library (E-Library)",
  "Hostel Area",
];

/**
 * Type definitions for checkout data structures
 */

type User = inferProcedureOutput<AppRouter["user"]["getById"]>;

interface OrderSummaryProps {
  subtotal: number;
  shippingCost: number;
  totalItems: number;
  onPlaceOrderAction: () => void;
  userData: User;
  isComplete: boolean;
  isValidating: boolean;
  isProcessing: boolean;
  deliveryType: DeliveryType;
  handleDeliveryTypeChangeAction: (val: DeliveryType) => void;
}

/** Displays order summary and checkout controls */
export default function OrderSummary({
  subtotal,
  shippingCost,
  totalItems,
  onPlaceOrderAction,
  userData,
  isComplete,
  isValidating,
  isProcessing,
  deliveryType,
  handleDeliveryTypeChangeAction,
}: OrderSummaryProps) {
  /**
   * Order Total Calculation
   *
   * Calculate the final order total including all costs.
   * This calculation is also performed server-side for security.
   */
  const total = subtotal + shippingCost;

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

  /**
   * Shipping Information Completeness Check
   *
   * Verify that all required shipping information is available
   * to prevent order placement with incomplete data.
   */
  const hasCompleteShippingInfo =
    userData?.firstName &&
    userData?.lastName &&
    userData?.address &&
    userData?.phoneNumber &&
    userData?.cityOfResidence &&
    userData?.stateOfResidence;

  return (
    <Card className="sticky top-6 border-soraxi-green/30 shadow-lg">
      {/* Shipping Information Section */}
      <Accordion type="single" collapsible defaultValue="shipping-info">
        <AccordionItem value="shipping-info" className="border-none">
          <AccordionTrigger className="group px-6 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg transition-colors">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-soraxi-green flex-shrink-0" />
              <CardTitle className="text-base font-semibold text-foreground">
                Shipping Information
              </CardTitle>
              {!hasCompleteShippingInfo && (
                <Badge variant="destructive" className="ml-2">
                  Incomplete
                </Badge>
              )}
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <CardContent className="px-6 py-4 bg-muted/20">
              <div className="space-y-4">
                {hasCompleteShippingInfo ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">
                          Where should we deliver?
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer" />
                          </PopoverTrigger>
                          <PopoverContent className="max-w-xs text-sm dark:bg-muted">
                            <p>
                              Choose where you’d like your order delivered.{" "}
                              <br />
                              <strong>Campus/Within Campus:</strong> Delivered
                              to a location within your school campus. (e.g.,
                              Main Gate, Unical E-Library) <br />
                              {/* <strong>Off-Campus/Outside Campus:</strong>{" "}
                              Delivered outside the campus (e.g., your home
                              address). */}
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <Select
                        defaultValue={deliveryType}
                        value={deliveryType}
                        onValueChange={(value: DeliveryType) =>
                          handleDeliveryTypeChangeAction(value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose where you’d like your order delivered" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="campus">Within Campus</SelectItem>
                          {/* <SelectItem value="off-campus">
                            Outside Campus
                          </SelectItem> */}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Customer Name */}
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-foreground">
                        {userData.firstName} {userData.lastName}
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">
                        {userData.phoneNumber}
                      </span>
                    </div>

                    {/* Shipping Address */}
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        {deliveryType === "off-campus" ? (
                          <>
                            <p className="text-foreground leading-relaxed">
                              {userData.address}
                            </p>
                            <p className="text-muted-foreground text-sm">
                              {userData.cityOfResidence},{" "}
                              {userData.stateOfResidence}
                              {userData.postalCode && ` ${userData.postalCode}`}
                            </p>
                          </>
                        ) : (
                          <>
                            {/* <p className="text-foreground leading-relaxed font-medium">
                              Choose a campus delivery spot:
                            </p> */}
                            <ul className="text-muted-foreground text-sm list-disc ml-5">
                              {campusLocations.map((location) => (
                                <li key={location}>{location}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Incomplete Shipping Information Warning */
                  <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        Incomplete Shipping Information
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Please update your profile with complete shipping
                        details before placing your order.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Order Summary Section */}
      <CardHeader className="pt-4 pb-2">
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
          <span className="font-medium">{formatNaira(subtotal)}</span>
        </div>

        {/* Shipping Cost */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Shipping</span>
          <span className="font-medium">
            {shippingCost === 0
              ? // <Badge variant="secondary" className="text-xs font-normal">
                //   Free
                // </Badge>
                formatNaira(shippingCost)
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

        {!hasCompleteShippingInfo && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <p className="text-sm text-red-800">
                Complete shipping information is required to place your order.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Place Order Button */}
      <CardFooter className="flex flex-col space-y-4">
        {/* <CouponInput
          orderTotal={subtotal + shippingCost}
          storeIds={[]} // or whatever represents store IDs
          onCouponApplied={(discount, code) => {
            console.log(`Coupon ${code} applied with discount ₦${discount}`);
            toast.info(`Coupon ${code} applied with discount ₦${discount}`);
            // You can also update local checkout state here
          }}
        /> */}

        <Button
          className="w-full bg-soraxi-green text-white hover:bg-soraxi-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          size="lg"
          onClick={onPlaceOrderAction}
          disabled={!isComplete || isLoading || !hasCompleteShippingInfo}
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

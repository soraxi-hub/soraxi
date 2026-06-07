"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DeliveryType } from "@/enums";
import { EmptyCart } from "@/modules/cart/empty-cart";
import { ProfileErrorFallback } from "@/modules/checkout/profile-error-fallback";

import StoreCartGroup from "@/modules/checkout/store-cart-group";
import OrderSummary from "@/modules/checkout/order-summary";

import {
  AppliedCouponType,
  useCheckoutService,
} from "@/hooks/use-checkout-hook";
import { GroupedCartItem } from "@/domain/cart/cart-interface";
import { PublicToJSONUserType } from "@/domain/users/user-interface";

export type CheckoutData = {
  cartData: GroupedCartItem;
  userData: PublicToJSONUserType;
};

interface CheckoutPageClientProps {
  initialState: CheckoutData;
}

export function CheckoutPageClient({ initialState }: CheckoutPageClientProps) {
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponType | null>(
    null,
  );

  const {
    error,
    setError,
    onPlaceOrder,
    isProcessing,
    isValidating,
    deliveryType,
    setDeliveryType,
    setIsValidating,
    validationErrors,
    totalShippingCost,
    isCheckoutComplete,
    selectedShippingMethods,
    handleShippingMethodChange,
  } = useCheckoutService(
    initialState.cartData,
    initialState.userData,
    appliedCoupon,
  );

  const handleDeliveryTypeChange = (val: DeliveryType) => {
    setDeliveryType(val);
    toast.success(
      `Status updated to: ${val === DeliveryType.Campus ? "Within Campus" : "Outside Campus"}`,
    );
  };

  const handlePlaceOrder = async () => {
    try {
      await onPlaceOrder();
    } catch (err: any) {
      setError(err.message || "Failed to initialize payment");
    } finally {
      setIsValidating(false);
    }
  };

  // Handle empty cart case
  if (!initialState.cartData || initialState.cartData.totalQuantity === 0) {
    return <EmptyCart />;
  }

  // Handle missing user data
  if (!initialState.userData) {
    return <ProfileErrorFallback />;
  }

  const hasValidationErrors = validationErrors.length > 0;

  return (
    <>
      {/* Validation Errors Alert */}
      {hasValidationErrors && (
        <Alert
          variant="destructive"
          className="mb-6 dark:bg-muted/50 border-soraxi-green/15"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cart Validation Issues</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Please resolve the following issues before proceeding:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {validationErrors.map((err, index) => (
                <li key={index} className="text-sm">
                  {err}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* General Error Alert */}
      {error && !hasValidationErrors && (
        <Alert
          variant="destructive"
          className="mb-6 dark:bg-muted/50 border-soraxi-green/15"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checkout Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Checkout Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items Section */}
        <div className="lg:col-span-2 space-y-6">
          {initialState.cartData.groupedCart.map((group) => (
            <div key={group.storeId} data-store-id={group.storeId}>
              <StoreCartGroup
                storeGroup={group}
                onShippingMethodChangeAction={(method) => {
                  handleShippingMethodChange(group.storeId, method);
                }}
                selectedShippingMethod={selectedShippingMethods[group.storeId]}
              />
            </div>
          ))}
        </div>

        {/* Order Summary Section */}
        <div className="lg:col-span-1">
          <OrderSummary
            subtotal={initialState.cartData.totalPrice}
            discount={appliedCoupon?.discount}
            shippingCost={totalShippingCost}
            totalItems={initialState.cartData.totalQuantity}
            onPlaceOrderAction={handlePlaceOrder}
            isValidating={isValidating}
            isProcessing={isProcessing}
            userData={initialState.userData}
            isComplete={isCheckoutComplete && !hasValidationErrors}
            deliveryType={deliveryType}
            handleDeliveryTypeChangeAction={handleDeliveryTypeChange}
            setAppliedCoupon={setAppliedCoupon}
          />
        </div>
      </div>
    </>
  );
}

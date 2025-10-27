"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DeliveryType } from "@/enums";
import { EmptyCart } from "@/modules/cart/empty-cart";
import { ProfileErrorFallback } from "@/modules/checkout/profile-error-fallback";

import StoreCartGroup from "@/modules/checkout/store-cart-group";
import OrderSummary from "@/modules/checkout/order-summary";

import { PaymentService } from "@/domain/checkout/payment-service";
import { AppRouter } from "@/trpc/routers/_app";
import { inferProcedureOutput } from "@trpc/server";
import { CheckoutFactoryClientSide } from "@/domain/checkout/factories/checkout-factory.client";
import { useCheckoutService } from "@/hooks/use-checkout-service";

export type CartOutput = inferProcedureOutput<
  AppRouter["checkout"]["getGroupedCart"]
>;
export type UserOutput = inferProcedureOutput<AppRouter["user"]["getById"]>;

export type CheckoutData = {
  cartData: CartOutput;
  userData: UserOutput;
};

interface CheckoutPageClientProps {
  initialState: CheckoutData;
}

export function CheckoutPageClient({ initialState }: CheckoutPageClientProps) {
  const {
    error,
    setError,
    isValidating,
    setIsValidating,
    paymentMutation,
    validationErrors,
    totalShippingCost,
    isCheckoutComplete,
    selectedShippingMethods,
    validateAndPreparePayment,
    handleShippingMethodChange,
  } = useCheckoutService(initialState.cartData, initialState.userData);

  // Initialize state manager with factory pattern
  const stateManager = useMemo(
    () =>
      CheckoutFactoryClientSide.createCheckoutStateManagerClientSide(
        initialState.cartData,
        initialState.userData
      ),
    [initialState.cartData, initialState.userData]
  );
  const paymentService = useMemo(() => new PaymentService(), []);

  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    DeliveryType.Campus
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeliveryTypeChange = (val: DeliveryType) => {
    setDeliveryType(val);
    toast.success(
      `Status updated to: ${val === DeliveryType.Campus ? "Within Campus" : "Outside Campus"}`
    );
  };

  const handlePlaceOrder = async () => {
    try {
      setError(null);

      // Step 1: Validate + prepare payment data
      const paymentData = await validateAndPreparePayment(deliveryType);
      if (!paymentData) return;

      // Step 2: Process payment
      setIsProcessing(true);
      await paymentService.processPayment(paymentData, paymentMutation);
    } catch (err: any) {
      console.error("Payment processing error:", err);
      setError(
        err.message ||
          "An error occurred while processing your payment. Please try again."
      );
    } finally {
      setIsProcessing(false);
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
                  stateManager
                    .getShippingService()
                    .selectMethod(group.storeId, method);
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
            shippingCost={totalShippingCost}
            totalItems={initialState.cartData.totalQuantity}
            onPlaceOrderAction={handlePlaceOrder}
            isValidating={isValidating}
            isProcessing={isProcessing}
            userData={initialState.userData}
            isComplete={isCheckoutComplete && !hasValidationErrors}
            deliveryType={deliveryType}
            handleDeliveryTypeChangeAction={handleDeliveryTypeChange}
          />
        </div>
      </div>
    </>
  );
}

"use client";

import { DeliveryType } from "@/enums";
import { ShippingMethod } from "@/types";
import { CouponTypeEnum } from "@/enums";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";

import { CheckoutService } from "@/services/checkout.service";
import { GroupedCartItem } from "@/domain/cart/cart-interface";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export type AppliedCouponType = {
  code: string;
  discount: number;
  type: CouponTypeEnum;
  value: number;
} | null;

interface UseCheckoutServiceReturn {
  error: string | null;
  isProcessing: boolean;
  isValidating: boolean;
  totalShippingCost: number;
  deliveryType: DeliveryType;
  validationErrors: string[];
  isCheckoutComplete: boolean;
  setError: (error: string | null) => void;
  setIsValidating: (value: boolean) => void;
  setValidationErrors: (errors: string[]) => void;
  setDeliveryType: Dispatch<SetStateAction<DeliveryType>>;
  selectedShippingMethods: Record<string, ShippingMethod>;
  onPlaceOrder: () => Promise<void>;
  handleShippingMethodChange: (storeId: string, method: ShippingMethod) => void;
}

export function useCheckoutService(
  cartData: GroupedCartItem,
  userData: PublicToJSONUserType,
  appliedCoupon: AppliedCouponType,
): UseCheckoutServiceReturn {
  const checkoutService = new CheckoutService(cartData, userData);
  const trpc = useTRPC();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedShippingMethods, setSelectedShippingMethods] = useState<
    Record<string, ShippingMethod>
  >({});
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    DeliveryType.Campus,
  );
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Validates user's cart in real time using tRPC.
   */
  const cartValidationMutation = useMutation(
    trpc.checkout.validateUserCart.mutationOptions({
      onSuccess: (data) => {
        setValidationErrors(data ? data.validationErrors : []);
      },
      onError: (error) => {
        console.error("Cart validation failed:", error);
        setError("Failed to validate cart. Please try again.");
      },
    }),
  );

  /**
   * Payment initialization mutation using Flutterwave API.
   * Redirects user to payment link upon success.
   */
  const paymentMutation = useMutation(
    trpc.flutterwave.initializePayment.mutationOptions({
      onSuccess: (response) => {
        if (response.status && response.data?.link) {
          toast.success("Redirecting to payment...");
          window.location.href = response.data.link;
        } else {
          const errorMessage =
            response.message || "Failed to initialize payment with Flutterwave";
          toast.error(errorMessage);
          setError(errorMessage);
        }
      },
      onError: (err) => {
        console.error("Payment error:", err);
        toast.error(
          err.message || "Something went wrong while initializing payment.",
        );
        setError(err.message || "Unable to process payment at this time.");
      },
    }),
  );

  /**
   * Shipping method handler (UI only)
   */
  const handleShippingMethodChange = (
    storeId: string,
    method: ShippingMethod,
  ) => {
    setSelectedShippingMethods((prev) => ({
      ...prev,
      [storeId]: method,
    }));

    if (error?.includes("shipping")) setError(null);
  };

  /**
   * Derived values (now delegated to service)
   */
  const isCheckoutComplete = checkoutService.isCheckoutComplete(
    selectedShippingMethods,
  );

  const totalShippingCost = checkoutService.calculateTotalShippingCost(
    selectedShippingMethods,
  );

  /**
   * MAIN FLOW: validation + preparation
   */
  const validateAndPreparePayment = async () => {
    try {
      setIsValidating(true);
      const storesNeedingShipping = checkoutService.storesRequiringShipping();

      if (
        storesNeedingShipping > 0 &&
        Object.keys(selectedShippingMethods).length < storesNeedingShipping
      ) {
        setError(
          "Please select shipping methods for all stores with physical products",
        );
        return null;
      }

      // Validate cart contents
      const validationResult = await cartValidationMutation.mutateAsync();
      if (!validationResult.isValid) {
        setValidationErrors(validationResult.validationErrors);
        setIsValidating(false);
        return null;
      }

      const shippingInfo = checkoutService.validateShippingInfo();

      if (!shippingInfo.isValid) {
        setError(shippingInfo.error || null);
        return null;
      }

      return checkoutService.preparePaymentData({
        selectedShippingMethods,
        appliedCoupon,
        deliveryType,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const onPlaceOrder = async () => {
    try {
      setError(null);

      // Step 1: Validate + prepare payment data
      const paymentData = await validateAndPreparePayment();
      if (!paymentData) return;

      // Step 2: Process payment
      setIsProcessing(true);
      // @ts-ignore
      await paymentMutation.mutateAsync(paymentData);
    } catch (err: any) {
      setError(
        err.message ||
          "An error occurred while processing your payment. Please try again.",
      );
    } finally {
      setIsValidating(false);
      setIsProcessing(false);
    }
  };

  return {
    error,
    setError,
    onPlaceOrder,
    deliveryType,
    isProcessing,
    isValidating,
    setDeliveryType,
    setIsValidating,
    validationErrors,
    totalShippingCost,
    isCheckoutComplete,
    setValidationErrors,
    selectedShippingMethods,
    handleShippingMethodChange,
  };
}

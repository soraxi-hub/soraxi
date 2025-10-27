"use client";

import { DeliveryType } from "@/enums";
import { currencyOperations } from "@/lib/utils/naira";
import { CheckoutData } from "@/modules/checkout/checkout-page-client";
import { useTRPC } from "@/trpc/client";
import { CartProduct, ShippingMethod } from "@/types";
import { ProductTypeEnum } from "@/validators/product-validators";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Structured payload returned after successful validation
 * and before payment initialization.
 */
interface PreparedPaymentData {
  cartItemsWithShippingMethod: {
    selectedShippingMethod: ShippingMethod;
    storeId: string;
    storeName: string;
    products: {
      product: CartProduct;
      quantity: number;
      selectedSize?: {
        size: string;
        price: number;
        quantity: number;
      };
      productType: ProductTypeEnum;
      storeId: string;
    }[];
  }[];
  amount: number;
  customer: {
    name: string;
    email: string;
    phone_number: string;
  };
  meta: {
    city: string;
    state: string;
    address: string;
    postal_code: string;
    userId: string;
    deliveryType: DeliveryType;
  };
}

/**
 * Return type for the `useCheckoutService` hook.
 */
interface UseCheckoutServiceReturn {
  error: string | null;
  setError: (error: string | null) => void;
  isValidating: boolean;
  setIsValidating: (value: boolean) => void;
  paymentMutation: any;
  validationErrors: string[];
  totalShippingCost: number;
  isCheckoutComplete: boolean;
  setValidationErrors: (errors: string[]) => void;
  selectedShippingMethods: Record<string, ShippingMethod>;
  validateAndPreparePayment: (
    deliveryType: DeliveryType
  ) => Promise<PreparedPaymentData | null>;
  calculateTotalShippingCost: () => number;
  handleShippingMethodChange: (storeId: string, method: ShippingMethod) => void;
}

/**
 * Custom React hook for handling checkout logic.
 *
 * Handles:
 * - Shipping method management
 * - Cart validation
 * - Payment preparation & initialization
 */
export function useCheckoutService(
  cartData: CheckoutData["cartData"],
  userData: CheckoutData["userData"]
): UseCheckoutServiceReturn {
  const trpc = useTRPC();
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedShippingMethods, setSelectedShippingMethods] = useState<
    Record<string, ShippingMethod>
  >({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Updates the selected shipping method for a given store.
   * Clears related errors if any exist.
   */
  const handleShippingMethodChange = (
    storeId: string,
    method: ShippingMethod
  ) => {
    setSelectedShippingMethods((prev) => ({
      ...prev,
      [storeId]: method,
    }));

    if (error?.includes("shipping")) setError(null);
  };

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
    })
  );

  /** Checks if user has selected all required shipping methods */
  const isCheckoutComplete = cartData.groupedCart.every((group) => {
    const hasPhysical = group.products.some(
      (p) => p.productType === ProductTypeEnum.Product
    );
    if (!hasPhysical) return true;

    if (!group.shippingMethods || group.shippingMethods.length === 0)
      return true;

    return !!selectedShippingMethods[group.storeId];
  });

  /** Returns count of stores that require shipping */
  const storesRequiringShipping = (
    cartData: CheckoutData["cartData"]
  ): number => {
    return cartData.groupedCart.filter((group) => {
      const hasPhysical = group.products.some(
        (p) => p.productType === ProductTypeEnum.Product
      );
      const hasShipping =
        group.shippingMethods && group.shippingMethods.length > 0;
      return hasPhysical && hasShipping;
    }).length;
  };

  /**
   * Validates that user's shipping info is complete.
   */
  const validateShippingInfo = (
    userData: any
  ): { isValid: boolean; error?: string } => {
    const required = [
      "firstName",
      "lastName",
      "address",
      "phoneNumber",
      "cityOfResidence",
      "stateOfResidence",
    ];

    const missing = required.filter((field) => !userData[field]);
    if (missing.length > 0) {
      return {
        isValid: false,
        error: "Complete shipping information is required to place your order.",
      };
    }

    return { isValid: true };
  };

  /** Calculates total shipping cost from selected shipping methods */
  const calculateTotalShippingCost = (): number => {
    return Object.values(selectedShippingMethods).reduce(
      (total, method) => currencyOperations.add(total, method.price),
      0
    );
  };

  /**
   * Validates all checkout data and prepares payment payload.
   * Returns structured data for payment initialization.
   */
  const validateAndPreparePayment = async (
    deliveryType: DeliveryType
  ): Promise<PreparedPaymentData | null> => {
    setIsValidating(true);
    const storesNeedingShipping = storesRequiringShipping(cartData);

    // Ensure all stores with physical products have shipping selected
    if (
      storesNeedingShipping > 0 &&
      Object.keys(selectedShippingMethods).length < storesNeedingShipping
    ) {
      setError(
        "Please select shipping methods for all stores with physical products"
      );
      setIsValidating(false);
      return null;
    }

    // Validate cart contents
    const validationResult = await cartValidationMutation.mutateAsync();
    if (!validationResult.isValid) {
      setValidationErrors(validationResult.validationErrors);
      setIsValidating(false);
      return null;
    }

    // Validate shipping information
    const shippingInfoValidation = validateShippingInfo(userData);
    if (!shippingInfoValidation.isValid) {
      setError(shippingInfoValidation.error || null);
      setIsValidating(false);
      return null;
    }

    setIsValidating(false);

    // Prepare data for payment API
    const totalShipping = calculateTotalShippingCost();
    const totalAmount = currencyOperations.add(
      cartData.totalPrice,
      totalShipping
    );

    return {
      cartItemsWithShippingMethod: cartData.groupedCart.map(
        ({ shippingMethods, ...group }) => ({
          ...group,
          selectedShippingMethod: selectedShippingMethods[group.storeId],
        })
      ),
      amount: totalAmount,
      customer: {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        phone_number: userData.phoneNumber,
      },
      meta: {
        city: userData.cityOfResidence,
        state: userData.stateOfResidence,
        address: userData.address,
        postal_code: userData.postalCode || "",
        userId: userData._id,
        deliveryType,
      },
    };
  };

  /** Calculates total shipping cost (used for display and payment summary) */
  const totalShippingCost = Object.values(selectedShippingMethods).reduce(
    (total, method) => currencyOperations.add(total, method.price),
    0
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
          err.message || "Something went wrong while initializing payment."
        );
        setError(err.message || "Unable to process payment at this time.");
      },
    })
  );

  return {
    error,
    setError,
    isValidating,
    setIsValidating,
    paymentMutation,
    validationErrors,
    totalShippingCost,
    isCheckoutComplete,
    setValidationErrors,
    selectedShippingMethods,
    validateAndPreparePayment,
    calculateTotalShippingCost,
    handleShippingMethodChange,
  };
}

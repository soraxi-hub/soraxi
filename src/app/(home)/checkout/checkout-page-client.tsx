"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { currencyOperations } from "@/lib/utils/naira";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { siteConfig } from "@/config/site";

// Import components
import StoreCartGroup from "@/modules/checkout/store-cart-group";
import OrderSummary from "@/modules/checkout/order-summary";

// Import types
import type { ShippingMethod } from "@/types/index";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

/**
 * Type definitions for checkout data structures
 */
type CheckoutOutput = inferProcedureOutput<
  AppRouter["checkout"]["getGroupedCart"]
>;
type UserOutput = inferProcedureOutput<AppRouter["user"]["getById"]>;

interface CheckoutPageClientProps {
  initialState: {
    cartData: CheckoutOutput;
    userData: UserOutput;
    userId: string;
    validationErrors: string[];
    storesRequiringShipping: number;
    hasValidationErrors: boolean;
  };
}

/**
 * Client-Side Checkout Page Component
 *
 * Handles all interactive functionality for the checkout process:
 * - Shipping method selection and management
 * - Real-time cart validation
 * - Payment processing and integration
 * - Order total calculations
 * - Error handling and user feedback
 * - Optimistic UI updates
 *
 * This component receives pre-loaded data from the server component,
 * eliminating loading states and hydration mismatches while maintaining
 * full interactivity for the checkout process.
 *
 * @param initialState - Pre-loaded checkout data from server
 */
export function CheckoutPageClient({ initialState }: CheckoutPageClientProps) {
  const router = useRouter();
  const trpc = useTRPC();

  // Initialize state with server-provided data
  const [cartData] = useState(initialState.cartData);
  const [userData] = useState(initialState.userData);
  const [validationErrors, setValidationErrors] = useState<string[]>(
    initialState.validationErrors
  );
  const [error, setError] = useState<string | null>(null);

  // Loading states for different operations
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Shipping Method Management
   *
   * Track selected shipping methods by store ID and calculate total shipping costs.
   * This state management ensures that shipping selections persist across re-renders
   * and provides real-time cost updates.
   */
  const [selectedShippingMethods, setSelectedShippingMethods] = useState<
    Record<string, ShippingMethod>
  >({});
  const [totalShippingCost, setTotalShippingCost] = useState(0);

  /**
   * Cart Validation Mutation
   *
   * Uses tRPC mutation for real-time cart validation.
   * This ensures cart contents are still valid before payment processing.
   */
  const validateCartMutation = useMutation({
    ...trpc.checkout.validateUserCart.mutationOptions(),
    onSuccess: (data) => {
      setValidationErrors(data.validationErrors);
    },
    onError: (error) => {
      console.error("Cart validation failed:", error);
      setError("Failed to validate cart. Please try again.");
    },
  });

  /**
   * Calculate Total Shipping Cost Effect
   *
   * Recalculates total shipping cost whenever shipping method selections change.
   * Uses currency operations utility for precise decimal arithmetic.
   */
  useEffect(() => {
    let totalShipping = 0;
    Object.values(selectedShippingMethods).forEach((method) => {
      totalShipping = currencyOperations.add(totalShipping, method.price);
    });
    setTotalShippingCost(totalShipping);
  }, [selectedShippingMethods]);

  /**
   * Handle Shipping Method Selection
   *
   * Updates the selected shipping method for a specific store.
   * Maintains immutable state updates for predictable behavior.
   *
   * @param storeId - Unique identifier for the store
   * @param method - Selected shipping method object
   */
  const handleShippingMethodChange = (
    storeId: string,
    method: ShippingMethod
  ) => {
    setSelectedShippingMethods((prev) => ({
      ...prev,
      [storeId]: method,
    }));

    // Clear any previous errors when user makes selections
    if (error?.includes("shipping")) {
      setError(null);
    }
  };

  /**
   * Validate Cart Before Payment
   *
   * Performs comprehensive cart validation including:
   * - Product availability checks
   * - Stock quantity verification
   * - Price consistency validation
   * - Size/variant availability
   *
   * @returns Promise<boolean> - True if cart is valid, false otherwise
   */
  const validateCart = async (): Promise<boolean> => {
    try {
      setIsValidating(true);
      setValidationErrors([]);
      setError(null);

      const result = await validateCartMutation.mutateAsync({
        userId: initialState.userId,
      });

      return result.isValid;
    } catch (err: any) {
      console.error("Validation error:", err);

      // Handle different types of validation errors
      if (err?.shape?.cause && Array.isArray(err.shape.cause)) {
        setValidationErrors(err.shape.cause);
      } else {
        setError(err.message || "Failed to validate cart.");
      }

      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const initializePayment = useMutation(
    trpc.paystack.initializePayment.mutationOptions({
      onSuccess: (response) => {
        if (response.status && response.data?.authorization_url) {
          toast.success("Redirecting to payment...");
          window.location.href = response.data.authorization_url;
        } else {
          const errorMessage =
            response.message || "Failed to initialize payment with Paystack";
          toast.error(errorMessage);
          setError(errorMessage);
        }
      },
      onError: (err) => {
        console.error("Payment error:", err);
        toast.error("Something went wrong while initializing payment.");
        setError("Unable to process payment at this time.");
      },
    })
  );

  /**
   * Handle Place Order Process
   *
   * Orchestrates the complete order placement flow:
   * 1. Validates shipping method selections
   * 2. Performs final cart validation
   * 3. Prepares payment data
   * 4. Initializes payment gateway
   * 5. Handles errors and redirects
   *
   * This function implements comprehensive error handling and user feedback
   * to ensure a smooth checkout experience.
   */
  const handlePlaceOrder = async () => {
    try {
      // Reset any previous errors
      setError(null);

      /**
       * Shipping Method Validation
       *
       * Ensure all stores with physical products have shipping methods selected.
       * This prevents incomplete orders and provides clear user feedback.
       */
      const storesWithPhysicalProducts = cartData.groupedCart.filter((group) =>
        group.products.some((p) => p.productType === "Product")
      );

      const storesNeedingShipping = storesWithPhysicalProducts.filter(
        (group) => group.shippingMethods && group.shippingMethods.length > 0
      );

      if (
        storesNeedingShipping.length > 0 &&
        Object.keys(selectedShippingMethods).length <
          storesNeedingShipping.length
      ) {
        setError(
          "Please select shipping methods for all stores with physical products"
        );

        // Scroll to first store missing shipping selection
        const firstStoreElement = document.querySelector("[data-store-id]");
        firstStoreElement?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        return;
      }

      /**
       * Final Cart Validation
       *
       * Perform one final validation to ensure cart contents are still valid
       * before proceeding to payment. This catches any last-minute stock changes.
       */
      const isValid = await validateCart();
      if (!isValid) {
        toast.error("Please resolve cart issues before proceeding");
        return;
      }

      // Validate user data availability
      if (!userData) {
        setError(
          "User profile information is not available. Please refresh the page."
        );
        return;
      }

      setIsProcessing(true);

      /**
       * Payment Data Preparation
       *
       * Structure the payment data with all necessary information:
       * - Cart items with selected shipping methods
       * - Customer information
       * - Shipping details
       * - Order metadata
       */
      const paymentData = {
        cartItemsWithShippingMethod: cartData.groupedCart.map((group) => ({
          ...group,
          selectedShippingMethod: selectedShippingMethods[group.storeID],
        })),
        amount: currencyOperations.add(cartData.totalPrice, totalShippingCost),
        customer: {
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          uniqueRef: siteConfig.name + uuidv4(),
          phone_number: userData.phoneNumber,
        },
        meta: {
          city: userData.cityOfResidence,
          state: userData.stateOfResidence,
          address: userData.address,
          postal_code: userData.postalCode || "",
          userID: userData._id,
        },
      };

      // console.log("paymentData:", paymentData);

      /**
       * Payment Gateway Integration
       *
       * Initialize payment with Paystack gateway.
       * Handles both successful initialization and error scenarios.
       */
      initializePayment.mutate(paymentData);

      // const response = await axios.post("/api/paystack", paymentData);

      // if (response.status === 200 && response.data.data?.authorization_url) {
      //   // Success: Redirect to payment gateway
      //   toast.success("Redirecting to payment...");
      //   window.location.href = response.data.data.authorization_url;
      // } else {
      //   // Payment initialization failed
      //   const errorMessage =
      //     response.data.error || "Failed to initialize payment";
      //   toast.error(errorMessage);
      //   setError(errorMessage);
      // }
    } catch (err: any) {
      /**
       * Comprehensive Error Handling
       *
       * Handle different types of errors that can occur during checkout:
       * - Network errors
       * - Payment gateway errors
       * - Server errors
       * - Validation errors
       */
      console.error("Payment processing error:", err);

      let errorMessage =
        "An error occurred while processing your payment. Please try again.";

      // Customize error message based on error type
      if (err.response?.status === 400) {
        errorMessage =
          "Invalid payment information. Please check your details and try again.";
      } else if (err.response?.status === 500) {
        errorMessage =
          "Server error occurred. Please try again in a few moments.";
      } else if (err.code === "NETWORK_ERROR") {
        errorMessage =
          "Network connection error. Please check your internet connection.";
      }

      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Determine Checkout Completion Status
   *
   * Check if all required selections have been made to enable the place order button.
   * This provides real-time feedback on checkout readiness.
   */
  const isCheckoutComplete = cartData.groupedCart.every((group) => {
    // Skip shipping method check for digital-only stores
    const hasPhysicalProducts = group.products.some(
      (p) => p.productType === "Product"
    );
    if (!hasPhysicalProducts) return true;

    // Skip shipping method check for stores without shipping methods
    if (!group.shippingMethods || group.shippingMethods.length === 0)
      return true;

    // Check if shipping method is selected
    return !!selectedShippingMethods[group.storeID];
  });

  // Calculate if there are validation errors
  const hasValidationErrors = validationErrors.length > 0;

  return (
    <>
      {/* Validation Errors Alert */}
      {hasValidationErrors && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cart Validation Issues</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Please resolve the following issues before proceeding:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* General Error Alert */}
      {error && !hasValidationErrors && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checkout Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Checkout Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items Section */}
        <div className="lg:col-span-2 space-y-6">
          {cartData.groupedCart.map((group) => (
            <div key={group.storeID} data-store-id={group.storeID}>
              <StoreCartGroup
                storeGroup={group}
                onShippingMethodChange={(method) =>
                  handleShippingMethodChange(group.storeID, method)
                }
                selectedShippingMethod={selectedShippingMethods[group.storeID]}
              />
            </div>
          ))}
        </div>

        {/* Order Summary Section */}
        <div className="lg:col-span-1">
          <OrderSummary
            subtotal={cartData.totalPrice}
            shippingCost={totalShippingCost}
            totalItems={cartData.totalQuantity}
            onPlaceOrderAction={handlePlaceOrder}
            isValidating={isValidating}
            isProcessing={isProcessing}
            userData={userData}
            isComplete={isCheckoutComplete && !hasValidationErrors}
          />
        </div>
      </div>
    </>
  );
}

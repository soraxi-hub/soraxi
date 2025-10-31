"use server";

import { CheckoutData } from "@/modules/checkout/checkout-page-client";
// import { useTRPC } from "@/trpc/client";
import { caller } from "@/trpc/server";

// const trpc = useTRPC()

export class CheckoutManager {
  protected cartData: CheckoutData["cartData"] | null = null;
  protected userData: CheckoutData["userData"] | null = null;

  constructor(
    cartData: CheckoutData["cartData"],
    userData: CheckoutData["userData"]
  ) {
    this.setCartData(cartData);
    this.setUserData(userData);
  }

  setCartData(data: CheckoutData["cartData"]) {
    this.cartData = data;
  }

  setUserData(data: CheckoutData["userData"]) {
    this.userData = data;
  }

  async validateUserCart() {
    let initialValidationErrors: string[] = [];
    try {
      const validationResult = await caller.checkout.validateUserCart();
      if (validationResult && !validationResult.isValid) {
        initialValidationErrors = validationResult.validationErrors ?? [];
      }
    } catch (validationError) {
      console.error("Initial cart validation failed:", validationError);
      // Continue with checkout but show validation errors in UI
    }

    return initialValidationErrors;
  }
}

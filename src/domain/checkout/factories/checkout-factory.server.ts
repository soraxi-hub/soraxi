import type { CheckoutData } from "@/modules/checkout/checkout-page-client";
import { CheckoutStateManagerServerSide } from "../checkout-state-manager-server-side";

/** Factory for creating checkout instances with proper initialization */
export class CheckoutFactoryServerSide {
  static createCheckoutStateManagerServerSide(
    cartData: CheckoutData["cartData"],
    userData: CheckoutData["userData"]
  ): CheckoutStateManagerServerSide {
    return new CheckoutStateManagerServerSide(cartData, userData);
  }
}

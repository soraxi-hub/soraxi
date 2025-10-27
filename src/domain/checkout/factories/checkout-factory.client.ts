import { CheckoutData } from "@/modules/checkout/checkout-page-client";
import { CheckoutStateManagerClientSide } from "../checkout-state-manager-client-side";

/** Factory for creating checkout instances with proper initialization */
export class CheckoutFactoryClientSide {
  static createCheckoutStateManagerClientSide(
    cartData: CheckoutData["cartData"],
    userData: CheckoutData["userData"]
  ): CheckoutStateManagerClientSide {
    return new CheckoutStateManagerClientSide(cartData, userData);
  }
}

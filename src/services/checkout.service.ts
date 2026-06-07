import { DeliveryType, PaymentGateway, ProductTypeEnum } from "@/enums";
import { currencyOperations } from "@/lib/utils/naira";
import { ShippingMethod } from "@/types";
import { CouponTypeEnum } from "@/enums";
import { CheckoutData } from "@/modules/checkout/checkout-page-client";
import { CartService } from "./cart/cart.service";
import {
  CartValidationResult,
  GroupedCartItem,
  GroupedCartStoreItem,
} from "@/domain/cart/cart-interface";
import { PaymentService } from "./payment/payment.service";
import { PublicToJSONUserType } from "@/domain/users/user-interface";

export type AppliedCouponType = {
  code: string;
  discount: number;
  type: CouponTypeEnum;
  value: number;
} | null;

export interface CartItemsWithShippingMethod {
  cartItemsWithShippingMethod: Array<
    Omit<GroupedCartStoreItem, "shippingMethods"> & {
      selectedShippingMethod: ShippingMethod;
    }
  >;
}

export interface PreparedPaymentData {
  amount: number;
  cartItemsWithShippingMethod: CartItemsWithShippingMethod["cartItemsWithShippingMethod"];
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
    couponCode?: string | null;
    deliveryType: DeliveryType;
  };
}

export class CheckoutService {
  protected cartData: GroupedCartItem;
  protected userData: PublicToJSONUserType;

  constructor(
    cartDataProps: GroupedCartItem,
    userDataProps: PublicToJSONUserType,
  ) {
    this.cartData = cartDataProps;
    this.userData = userDataProps;
  }

  /**
   * Returns the number of stores that require shipping.
   */
  storesRequiringShipping(): number {
    return this.cartData.groupedCart.filter((group) => {
      const hasPhysical = group.products.some(
        (p) => p.productType === ProductTypeEnum.Product,
      );

      const hasShipping =
        group.shippingMethods && group.shippingMethods.length > 0;

      return hasPhysical && hasShipping;
    }).length;
  }

  async validateUserCart(): Promise<CartValidationResult> {
    return await CartService.validateUserCart(this.userData.userId);
  }

  /**
   * Validates user shipping information.
   */
  validateShippingInfo(): {
    isValid: boolean;
    error?: string;
  } {
    const required: Array<keyof CheckoutData["userData"]> = [
      "firstName",
      "lastName",
      "address",
      "phoneNumber",
      "city",
      "state",
    ];

    const missing = required.filter((field) => !this.userData[field]);

    if (missing.length > 0) {
      return {
        isValid: false,
        error: "Complete shipping information is required to place your order.",
      };
    }

    return { isValid: true };
  }

  /**
   * Calculates total shipping amount.
   */
  calculateTotalShippingCost(
    selectedShippingMethods: Record<string, ShippingMethod>,
  ): number {
    return Object.values(selectedShippingMethods).reduce(
      (total, method) => currencyOperations.add(total, method.price),
      0,
    );
  }

  /**
   * Checks whether checkout is complete.
   */
  isCheckoutComplete(
    selectedShippingMethods: Record<string, ShippingMethod>,
  ): boolean {
    return this.cartData.groupedCart.every((group) => {
      const hasPhysical = group.products.some(
        (p) => p.productType === ProductTypeEnum.Product,
      );

      if (!hasPhysical) return true;

      if (!group.shippingMethods || group.shippingMethods.length === 0) {
        return true;
      }

      return !!selectedShippingMethods[group.storeId];
    });
  }

  /**
   * Prepares payment payload.
   */
  preparePaymentData(params: {
    selectedShippingMethods: Record<string, ShippingMethod>;
    appliedCoupon: AppliedCouponType;
    deliveryType: DeliveryType;
  }): PreparedPaymentData {
    const { selectedShippingMethods, appliedCoupon, deliveryType } = params;

    const totalShipping = this.calculateTotalShippingCost(
      selectedShippingMethods,
    );

    let totalAmount = currencyOperations.add(
      this.cartData.totalPrice,
      totalShipping,
    );

    if (appliedCoupon) {
      totalAmount = currencyOperations.subtract(
        totalAmount,
        appliedCoupon.discount,
      );

      // This prevent negative total amount
      totalAmount = Math.max(0, totalAmount);
    }

    return {
      cartItemsWithShippingMethod: this.cartData.groupedCart.map(
        ({ shippingMethods, ...group }) => ({
          ...group,
          selectedShippingMethod: selectedShippingMethods[group.storeId],
        }),
      ),

      amount: totalAmount,

      customer: {
        name: this.userData.fullName,
        email: this.userData.email,
        phone_number: this.userData.phoneNumber,
      },

      meta: {
        city: this.userData.city,
        state: this.userData.state,
        address: this.userData.address,
        postal_code: this.userData.postalCode,
        userId: this.userData.userId,
        couponCode: appliedCoupon?.code,
        deliveryType,
      },
    };
  }

  async placeOrder(
    paymentData: PreparedPaymentData,
    userData: PublicToJSONUserType,
  ) {
    const props = {
      input: paymentData,
      user: userData,
    };
    return await PaymentService.initializePayment({
      gateway: PaymentGateway.Flutterwave,
      props,
    });
  }
}

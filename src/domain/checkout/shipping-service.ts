import type { ShippingMethod } from "@/types/index";
import { currencyOperations } from "@/lib/utils/naira";
import type { CheckoutData } from "@/modules/checkout/checkout-page-client";
import { ProductTypeEnum } from "@/validators/product-validators";

/** Manages shipping method selection and cost calculations */
export class ShippingService {
  private selectedMethods: Record<string, ShippingMethod> = {};

  selectMethod(storeId: string, method: ShippingMethod): void {
    this.selectedMethods[storeId] = method;
  }

  getSelectedMethod(storeId: string): ShippingMethod | undefined {
    return this.selectedMethods[storeId];
  }

  getAllSelectedMethods(): Record<string, ShippingMethod> {
    return { ...this.selectedMethods };
  }

  calculateTotalShippingCost(): number {
    return Object.values(this.selectedMethods).reduce(
      (total, method) => currencyOperations.add(total, method.price),
      0
    );
  }

  getStoresRequiringShipping(cartData: CheckoutData["cartData"]): number {
    return cartData.groupedCart.filter((group) => {
      const hasPhysical = group.products.some(
        (p) => p.productType === ProductTypeEnum.Product
      );
      const hasShipping =
        group.shippingMethods && group.shippingMethods.length > 0;
      return hasPhysical && hasShipping;
    }).length;
  }

  reset(): void {
    this.selectedMethods = {};
  }
}

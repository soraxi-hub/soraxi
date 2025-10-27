import { ProductTypeEnum } from "@/validators/product-validators";
import { ShippingService } from "./shipping-service";
import { CheckoutData } from "@/modules/checkout/checkout-page-client";

/** Orchestrates checkout state and business logic */
export class CheckoutStateManagerClientSide {
  private shippingService: ShippingService;
  private cartData: CheckoutData["cartData"];
  private userData: CheckoutData["userData"];
  private validationErrors: string[] = [];
  private error: string | null = null;

  constructor(
    cartData: CheckoutData["cartData"],
    userData: CheckoutData["userData"]
  ) {
    this.cartData = cartData;
    this.userData = userData;
    this.shippingService = new ShippingService();
  }

  getShippingService(): ShippingService {
    return this.shippingService;
  }

  setValidationErrors(errors: string[]): void {
    this.validationErrors = errors;
  }

  getValidationErrors(): string[] {
    return this.validationErrors;
  }

  getUserData() {
    return this.userData;
  }

  setError(error: string | null): void {
    this.error = error;
  }

  getError(): string | null {
    return this.error;
  }

  clearError(): void {
    this.error = null;
  }

  isCheckoutComplete(): boolean {
    return this.cartData.groupedCart.every((group) => {
      const hasPhysical = group.products.some(
        (p) => p.productType === ProductTypeEnum.Product
      );
      if (!hasPhysical) return true;

      if (!group.shippingMethods || group.shippingMethods.length === 0)
        return true;

      return !!this.shippingService.getSelectedMethod(group.storeId);
    });
  }

  getTotalShippingCost(): number {
    return this.shippingService.calculateTotalShippingCost();
  }
}

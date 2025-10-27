import { ValidationService } from "./validation-service";
import { ShippingService } from "./shipping-service";
import { currencyOperations } from "@/lib/utils/naira";
import { CheckoutData } from "@/modules/checkout/checkout-page-client";
import { PaymentData } from "@/types";
import { DeliveryType } from "@/enums";

/** Orchestrates checkout state and business logic */
export class CheckoutStateManagerServerSide {
  private validationService: ValidationService;
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
    this.validationService = new ValidationService();
    this.shippingService = new ShippingService();
  }

  getValidationService(): ValidationService {
    return this.validationService;
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

  setError(error: string | null): void {
    this.error = error;
  }

  getError(): string | null {
    return this.error;
  }

  clearError(): void {
    this.error = null;
  }

  async validateAndPreparePayment(
    deliveryType: DeliveryType
  ): Promise<PaymentData | null> {
    this.clearError();

    // Validate shipping methods
    const storesNeedingShipping =
      this.shippingService.getStoresRequiringShipping(this.cartData);
    const shippingValidation = this.shippingService.getAllSelectedMethods();

    if (
      storesNeedingShipping > 0 &&
      Object.keys(shippingValidation).length < storesNeedingShipping
    ) {
      this.setError(
        "Please select shipping methods for all stores with physical products"
      );
      return null;
    }

    // Validate cart
    const validationResult = await this.validationService.validateCart();
    if (!validationResult.isValid) {
      this.setValidationErrors(validationResult.validationErrors);
      return null;
    }

    // Validate shipping info
    const shippingInfoValidation = this.validationService.validateShippingInfo(
      this.userData
    );
    if (!shippingInfoValidation.isValid) {
      this.setError(shippingInfoValidation.error || null);
      return null;
    }

    // Prepare payment data
    const totalShipping = this.shippingService.calculateTotalShippingCost();
    const totalAmount = currencyOperations.add(
      this.cartData.totalPrice,
      totalShipping
    );

    return {
      cartItemsWithShippingMethod: this.cartData.groupedCart.map(
        ({ ...group }) => ({
          ...group,
          selectedShippingMethod: this.shippingService.getSelectedMethod(
            group.storeId
          ),
        })
      ),
      amount: totalAmount,
      customer: {
        name: `${this.userData.firstName} ${this.userData.lastName}`,
        email: this.userData.email,
        phone_number: this.userData.phoneNumber,
      },
      meta: {
        city: this.userData.cityOfResidence,
        state: this.userData.stateOfResidence,
        address: this.userData.address,
        postal_code: this.userData.postalCode || "",
        userId: this.userData._id,
        deliveryType: deliveryType,
      },
    };
  }

  isCheckoutComplete(): boolean {
    return this.cartData.groupedCart.every((group) => {
      const hasPhysical = group.products.some(
        (p) => p.productType === "Product"
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

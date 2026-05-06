import { PasswordService } from "@/lib/utils";
import { Store } from "./store";
import { StoreBusinessInfoEnum } from "@/validators/store-validators";
import { IStore } from "@/lib/db/models/store.model";

export class AuthenticatedStore extends Store {
  constructor(store: IStore) {
    super({
      ...store,
      storeOwner: store.storeOwner.toString(),
    });
  }

  async validatePassword(password: string): Promise<boolean> {
    return await PasswordService.validatePassword(password, this.password!);
  }

  isProfileComplete(): boolean {
    return !!(this.storeName && this.description);
  }

  isBusinessInfoComplete(): boolean {
    return !!(
      this.businessInfo &&
      (this.businessInfo.type === StoreBusinessInfoEnum.Individual ||
        (this.businessInfo.type === StoreBusinessInfoEnum.Company &&
          this.businessInfo.businessName &&
          this.businessInfo.registrationNumber))
    );
  }

  isShippingComplete(): boolean {
    return !!(this.shippingMethods && this.shippingMethods.length > 0);
  }

  isTermsComplete(): boolean {
    return !!this.agreedToTermsAt;
  }

  getOnboardingStats() {
    const onboardingStatus = {
      termsComplete: this.isTermsComplete(),
      profileComplete: this.isProfileComplete(),
      shippingComplete: this.isShippingComplete(),
      businessInfoComplete: this.isBusinessInfoComplete(),
    };

    const completedSteps =
      Object.values(onboardingStatus).filter(Boolean).length;
    const totalSteps = Object.keys(onboardingStatus).length;
    const isComplete = completedSteps === totalSteps;

    return {
      ...onboardingStatus,
      isComplete,
      completedSteps,
      totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
    };
  }
}

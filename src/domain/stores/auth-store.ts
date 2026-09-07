import { PasswordService } from "@/lib/utils";
import { Store } from "./store";
import { IStore } from "@/lib/db/models/store.model";
import { computeStoreOnboardingStats } from "./onboarding-stats";

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

  isShippingComplete(): boolean {
    return !!(this.shippingMethods && this.shippingMethods.length > 0);
  }

  isTermsComplete(): boolean {
    return !!this.agreedToTermsAt;
  }

  getOnboardingStats() {
    return computeStoreOnboardingStats({
      name: this.storeName,
      description: this.description,
      shippingMethods: this.shippingMethods,
      agreedToTermsAt: this.agreedToTermsAt,
    });
  }
}

import { StoreStatusEnum, StoreVerificationStatusEnum } from "@/enums";
import { Store, StoreProps } from "./store";
import { AuthenticatedStore } from "./auth-store";
import { IStore } from "@/lib/db/models/store.model";

export type BuildStoreInput = {
  storeName: string;
  storeEmail: string;
  password: string;
  ownerId: string;
  token: string;
};

export class StoreFactory {
  static build(input: BuildStoreInput & { uniqueId: string }) {
    return new Store({
      name: input.storeName.trim(),
      storeEmail: input.storeEmail.toLowerCase().trim(),
      password: input.password,
      storeOwner: input.ownerId,
      uniqueId: input.uniqueId,
      status: StoreStatusEnum.Pending,
      verification: {
        isVerified: false,
        method: StoreVerificationStatusEnum.Email,
      },
    } as StoreProps);
  }

  static buildAuthenticatedStore(store: IStore): AuthenticatedStore {
    return new AuthenticatedStore(store);
  }

  static store(props: StoreProps) {
    return new Store(props);
  }
}

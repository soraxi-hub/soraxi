import { StoreStatusEnum } from "@/enums";
import { truncateText } from "@/lib/utils";
import { UserStoreSummary } from "./user-interface";

export class userStoreSummary {
  constructor(
    public _id: string,
    public name: string,
    public status: StoreStatusEnum,
  ) {}

  get storeId() {
    return this._id;
  }

  get storeName() {
    return this.name;
  }

  get storeStatus() {
    return this.status;
  }

  get truncatedStoreName(): string {
    return truncateText(this.storeName, 12) as string;
  }

  get truncatedStoreId(): string {
    return truncateText(this.storeId) as string;
  }

  get isActive() {
    return this.status === StoreStatusEnum.Active;
  }

  toPublicJSON(): UserStoreSummary {
    return {
      storeId: this.storeId,
      storeName: this.storeName,
      status: this.status,
      isActive: this.isActive,
      truncatedStoreName: this.truncatedStoreName,
      truncatedStoreId: this.truncatedStoreId,
    };
  }
}

import { StoreStatusEnum } from "@/enums";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { PublicToJSON } from "../products/product-interface";
import { Store } from "./store";

/**
 * Store Profile Manager Class for public page.
 *
 * This store profile manager is mainly used it the "soraxihub.com/brand/[storeId or storeSlug]" page.
 */
export class StoreProfileManagerPublic {
  private readonly populatedProducts: PublicToJSON[] = [];
  private store: Store;

  constructor(store: Store, populatedProducts: PublicToJSON[]) {
    this.store = store;
    this.populatedProducts = populatedProducts;
  }

  get storeData(): Store {
    return this.store;
  }

  get StoreStats(): {
    followersCount: number;
    productsCount: number;
    establishedDate: string;
    storeAge: string;
  } {
    const createdDate = new Date(this.store.createdAt ?? new Date());

    return {
      followersCount: this.store.followersCount,
      productsCount: this.store.productsCount,
      establishedDate: createdDate.toLocaleDateString(),
      storeAge: DateFormatter.accountAge(this.store.createdAt ?? new Date()),
    };
  }

  // Status helpers
  get statusInfo(): {
    status: StoreStatusEnum | "unknown";
    color: string;
    displayText: string;
  } {
    const status = this.store.status;

    switch (status) {
      case StoreStatusEnum.Active:
        return {
          status,
          color: "bg-soraxi-success",
          displayText: "Active",
        };
      case StoreStatusEnum.Pending:
        return {
          status,
          color: "bg-soraxi-warning",
          displayText: "Pending Review",
        };
      case StoreStatusEnum.Suspended:
        return {
          status,
          color: "bg-soraxi-error",
          displayText: "Suspended",
        };
      default:
        return {
          status,
          color: "bg-soraxi-warning",
          displayText: "Unknown",
        };
    }
  }

  get products() {
    return this.populatedProducts;
  }
}

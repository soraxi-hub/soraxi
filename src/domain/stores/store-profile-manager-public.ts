import { StoreStatusEnum } from "@/enums";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { PublicToJSON } from "../products/product-interface";
import { Store } from "./store";

/**
 * Badge tone for the store's moderation status.
 *
 * A token rather than a class string so the storefront owns its own styling —
 * the domain layer decides *what* the status is, not what colour it renders in.
 */
export type StoreStatusTone = "success" | "warning" | "danger";

/**
 * The exact shape the public storefront renders.
 *
 * This is deliberately an allow-list. The store document carries the password
 * hash, contact email, payout bank details, OTP throttle state and wallet id;
 * none of that may cross to the browser, and an allow-list stays safe when new
 * sensitive fields are added to the model later.
 */
export interface StorefrontStoreView {
  storeId: string;
  storeName: string;
  /** Up to two letters derived from the store name, for the avatar fallback. */
  initials: string;
  /** e.g. `University of Calabar (UNICAL)`. Absent until backfilled. */
  institution?: string;
  description: string;
  statusLabel: string;
  statusTone: StoreStatusTone;
  /** e.g. `March 2026` */
  memberSince: string;
  ordersFulfilled: number;
  averageRating: number;
  reviewCount: number;
}

/**
 * Store Profile Manager Class for public page.
 *
 * This store profile manager is mainly used it the "soraxihub.com/brand/[storeId or storeSlug]" page.
 */
export class StoreProfileManagerPublic {
  private readonly populatedProducts: PublicToJSON[] = [];
  private readonly ordersFulfilled: number;
  private store: Store;

  constructor(
    store: Store,
    populatedProducts: PublicToJSON[],
    ordersFulfilled: number = 0,
  ) {
    this.store = store;
    this.populatedProducts = populatedProducts;
    this.ordersFulfilled = ordersFulfilled;
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
      productsCount: this.verifiedProductsCount,
      establishedDate: createdDate.toLocaleDateString(),
      storeAge: DateFormatter.accountAge(this.store.createdAt ?? new Date()),
    };
  }

  // Status helpers
  get statusInfo(): {
    status: StoreStatusEnum | "unknown";
    tone: StoreStatusTone;
    displayText: string;
  } {
    const status = this.store.status;

    switch (status) {
      case StoreStatusEnum.Active:
        return {
          status,
          tone: "success",
          displayText: "Verified vendor",
        };
      case StoreStatusEnum.Pending:
        return {
          status,
          tone: "warning",
          displayText: "Pending approval",
        };
      case StoreStatusEnum.Suspended:
        return {
          status,
          tone: "danger",
          displayText: "Suspended",
        };
      case StoreStatusEnum.Rejected:
        // A visitor is not told a store was rejected specifically; from the
        // outside it is indistinguishable from a suspension.
        return {
          status,
          tone: "danger",
          displayText: "Suspended",
        };
      default:
        return {
          status: "unknown",
          tone: "warning",
          displayText: "Unavailable",
        };
    }
  }

  get products() {
    return this.populatedProducts;
  }

  get verifiedProductsCount(): number {
    return this.products.length ?? 0;
  }

  /**
   * Initials for the avatar fallback: first letters of the first two words of
   * the store name (`Campus Tech Hub` → `CT`), falling back to the first two
   * characters for single-word names.
   */
  private get storeInitials(): string {
    const words = this.store.storeName.split(/\s+/).filter(Boolean);

    if (words.length === 0) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /**
   * Projects the store down to the public storefront view.
   *
   * Call this on the server and send the result to the client instead of the
   * store document — see `StorefrontStoreView` for why.
   */
  public toStorefrontJSON(): StorefrontStoreView {
    const { tone, displayText } = this.statusInfo;

    return {
      storeId: this.store.storeId,
      storeName: this.store.storeName,
      initials: this.storeInitials,
      institution: this.store.institution,
      description: this.store.description,
      statusLabel: displayText,
      statusTone: tone,
      memberSince: DateFormatter.monthYear(this.store.createdAt ?? new Date()),
      ordersFulfilled: this.ordersFulfilled,
      averageRating: this.store.averageRating,
      reviewCount: this.store.reviewCount,
    };
  }
}

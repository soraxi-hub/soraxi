import { AppRouter } from "@/trpc/routers/_app";
import { inferProcedureOutput } from "@trpc/server";
import { StoreStatusEnum } from "@/validators/store-validators";
import { DateFormatter } from "@/lib/utils/date-formatter";

type StoreProfileData = inferProcedureOutput<
  AppRouter["publicStore"]["getStoreProfilePublic"]
>;

/**
 * Store Profile Manager Class for public page.
 *
 * This store profile manager is mainly used it the "soraxihub.com/siteConfig.routeNames.brand/[storeId or storeSlug]" page.
 */
export class StoreProfileManagerPublic {
  private storeData: StoreProfileData | null = null;

  constructor(initialData?: StoreProfileData) {
    if (initialData) {
      this.setStoreData(initialData);
    }
  }

  // Data management
  setStoreData(data: StoreProfileData): void {
    this.storeData = data;
  }

  getStoreData(): StoreProfileData | null {
    return this.storeData;
  }

  // Utility methods
  getCharacterCount(text: string): {
    current: number;
    max: number;
    percentage: number;
  } {
    const current = text.length;
    const max = 1500; // Max for description
    const percentage = (current / max) * 100;
    return { current, max, percentage };
  }

  getStoreStats(): {
    followersCount: number;
    productsCount: number;
    establishedDate: string;
    storeAge: string;
  } {
    if (!this.storeData) {
      return {
        followersCount: 0,
        productsCount: 0,
        establishedDate: "",
        storeAge: "",
      };
    }

    const createdDate = new Date(this.storeData.createdAt);

    return {
      followersCount: this.storeData.stats.followersCount,
      productsCount: this.storeData.products.length,
      establishedDate: createdDate.toLocaleDateString(),
      storeAge: DateFormatter.accountAge(this.storeData.createdAt),
    };
  }

  // Status helpers
  getStoreStatus(): {
    status: StoreStatusEnum | "unknown";
    statusColor: string;
    statusText: string;
  } {
    if (!this.storeData) {
      return { status: "unknown", statusColor: "gray", statusText: "Unknown" };
    }

    const status = this.storeData.status as StoreStatusEnum;
    switch (status) {
      case StoreStatusEnum.Active:
        return {
          status,
          statusColor: "bg-soraxi-success",
          statusText: "Active",
        };
      case StoreStatusEnum.Pending:
        return {
          status,
          statusColor: "bg-soraxi-warning",
          statusText: "Pending Review",
        };
      case StoreStatusEnum.Suspended:
        return {
          status,
          statusColor: "bg-soraxi-error",
          statusText: "Suspended",
        };
      default:
        return {
          status,
          statusColor: "bg-soraxi-warning",
          statusText: "Unknown",
        };
    }
  }
}

// Singleton instance for global use
export const storeProfileManagerPublic = new StoreProfileManagerPublic();

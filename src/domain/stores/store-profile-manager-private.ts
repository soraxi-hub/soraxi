import { z } from "zod";
import { storeDescription, storeName } from "@/validators/store-validators";
import { DateFormatter } from "@/lib/utils/date-formatter";
import { StoreStatusEnum } from "@/enums";
import { Store } from "./store";
import { PublicToJSON } from "../products/product-interface";

// Validation schemas
export const StoreNameSchema = z.object({
  name: storeName,
});

export const StoreDescriptionSchema = z.object({
  description: storeDescription,
});

export const StoreProfileSchema = StoreNameSchema.merge(StoreDescriptionSchema);

// Types
export type StoreNameInput = z.infer<typeof StoreNameSchema>;
export type StoreDescriptionInput = z.infer<typeof StoreDescriptionSchema>;
export type StoreProfileInput = z.infer<typeof StoreProfileSchema>;

export interface StoreUpdateResult {
  success: boolean;
  message: string;
}

/**
 * Store Profile Manager Class for managing private store profile data.
 *
 * This store profile manager is mainly used it the "soraxihub.com/store/[storeId]" page.
 */
export class StoreProfileManagerPrivate {
  private isDirty = false;
  private pendingChanges: Partial<StoreProfileInput> = {};
  private readonly populatedProducts: PublicToJSON[] = [];
  private store: Store;

  constructor(store: Store, populatedProducts: PublicToJSON[]) {
    this.store = store;
    this.populatedProducts = populatedProducts;
    this.isDirty = false;
    this.pendingChanges = {};
  }

  get storeData(): Store {
    return this.store;
  }

  // Validation methods
  validateStoreName(name: string): { isValid: boolean; errors: string[] } {
    try {
      StoreNameSchema.parse({ name });
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => e.message),
        };
      }
      return { isValid: false, errors: ["Invalid store name"] };
    }
  }

  validateStoreDescription(description: string): {
    isValid: boolean;
    errors: string[];
  } {
    try {
      StoreDescriptionSchema.parse({ description });
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => e.message),
        };
      }
      return { isValid: false, errors: ["Invalid store description"] };
    }
  }

  validateFullProfile(data: StoreProfileInput): {
    isValid: boolean;
    errors: string[];
  } {
    try {
      StoreProfileSchema.parse(data);
      return { isValid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map((e) => e.message),
        };
      }
      return { isValid: false, errors: ["Invalid store profile"] };
    }
  }

  // Change tracking
  setPendingChange(field: keyof StoreProfileInput, value: string): void {
    this.pendingChanges[field] = value;
    this.isDirty = true;
  }

  getPendingChanges(): Partial<StoreProfileInput> {
    return { ...this.pendingChanges };
  }

  hasPendingChanges(): boolean {
    return this.isDirty && Object.keys(this.pendingChanges).length > 0;
  }

  clearPendingChanges(): void {
    this.pendingChanges = {};
    this.isDirty = false;
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

  get verifiedProductsCount(): number {
    return this.products.length ?? 0;
  }

  // Preview methods
  get previewData() {
    return {
      ...this.store,
      ...this.pendingChanges,
    };
  }
}

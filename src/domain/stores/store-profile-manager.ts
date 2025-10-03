import { AppRouter } from "@/trpc/routers/_app";
import { inferProcedureOutput } from "@trpc/server";
import { z } from "zod";
import {
  storeDescription,
  storeName,
  StoreStatusEnum,
} from "@/validators/store-validators";

type StoreProfileData = inferProcedureOutput<
  AppRouter["storeProfile"]["getStoreProfilePrivate"]
>;

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
  data?: Partial<StoreProfileData>;
}

// Store Profile Manager Class
export class StoreProfileManager {
  private storeData: StoreProfileData | null = null;
  private isDirty = false;
  private pendingChanges: Partial<StoreProfileInput> = {};

  constructor(initialData?: StoreProfileData) {
    if (initialData) {
      this.setStoreData(initialData);
    }
  }

  // Data management
  setStoreData(data: StoreProfileData): void {
    this.storeData = data;
    this.isDirty = false;
    this.pendingChanges = {};
  }

  getStoreData(): StoreProfileData | null {
    return this.storeData;
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
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let storeAge = "";
    if (ageInDays < 30) {
      storeAge = `${ageInDays} days`;
    } else if (ageInDays < 365) {
      const months = Math.floor(ageInDays / 30);
      storeAge = `${months} month${months > 1 ? "s" : ""}`;
    } else {
      const years = Math.floor(ageInDays / 365);
      storeAge = `${years} year${years > 1 ? "s" : ""}`;
    }

    return {
      followersCount: this.storeData.followers.length,
      productsCount: this.storeData.products.length,
      establishedDate: createdDate.toLocaleDateString(),
      storeAge,
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

  // Preview methods
  getPreviewData(): StoreProfileData | null {
    if (!this.storeData) return null;

    return {
      ...this.storeData,
      ...this.pendingChanges,
    } as StoreProfileData;
  }

  // Export/Import methods
  exportStoreData(): string {
    return JSON.stringify(this.storeData, null, 2);
  }

  importStoreData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      this.setStoreData(data);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance for global use
export const storeProfileManager = new StoreProfileManager();

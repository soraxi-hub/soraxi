import { AppRouter } from "@/trpc/routers/_app";
import { caller } from "@/trpc/server";
import { inferProcedureOutput } from "@trpc/server";

type Output = inferProcedureOutput<AppRouter["checkout"]["validateUserCart"]>;
/**
 * Since the success status is always true, developers must check the isValid key in other to determine if the cart is valid
 *
 * @param success - the success key is always true, i.e returing true.
 * @param isValid - the validation state of the cart. Either true or false.
 * @param validationErrors - the validation results. An array of strings.
 */
export type ValidationResult = Output;

/** Handles all cart validation logic */
export class ValidationService {
  async validateCart(): Promise<ValidationResult> {
    try {
      const result = await caller.checkout.validateUserCart();
      return result;
    } catch (error) {
      console.error("Cart validation failed:", error);
      return {
        success: true,
        isValid: false,
        validationErrors: ["Failed to validate cart. Please try again."],
      };
    }
  }

  validateShippingMethods(
    selectedMethods: Record<string, any>,
    requiredStores: number
  ): { isValid: boolean; error?: string } {
    if (Object.keys(selectedMethods).length < requiredStores) {
      return {
        isValid: false,
        error:
          "Please select shipping methods for all stores with physical products",
      };
    }
    return { isValid: true };
  }

  validateShippingInfo(userData: any): { isValid: boolean; error?: string } {
    const required = [
      "firstName",
      "lastName",
      "address",
      "phoneNumber",
      "cityOfResidence",
      "stateOfResidence",
    ];

    const missing = required.filter((field) => !userData[field]);
    if (missing.length > 0) {
      return {
        isValid: false,
        error: "Complete shipping information is required to place your order.",
      };
    }

    return { isValid: true };
  }
}

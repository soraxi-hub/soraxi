/**
 * hooks/use-generate-description.ts
 *
 * Encapsulates all state and fetch logic for AI description generation.
 *
 * Returns a stable API the component can bind to buttons and fields.
 * The hook is intentionally ignorant of ReactQuill — it just works with strings.
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ProductFormData } from "@/validators/product-validators";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseGenerateDescriptionOptions {
  storeId: string;
  formData: ProductFormData;
  onDescriptionGenerated: (description: string) => void;
}

interface UseGenerateDescriptionReturn {
  isGenerating: boolean;
  generateDescription: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGenerateDescription({
  storeId,
  formData,
  onDescriptionGenerated,
}: UseGenerateDescriptionOptions): UseGenerateDescriptionReturn {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDescription = useCallback(async () => {
    // Guard: name is the minimum required field
    if (!formData.name?.trim()) {
      toast.error(
        "Please enter a product name before generating a description.",
      );
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/store/products/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: formData.name,
          category: formData.category,
          subCategory: formData.subCategory,
          targetAudience: formData.targetAudience,
          price: formData.price,
          specifications: formData.specifications,
          productType: formData.productType,
        }),
      });

      const data = (await response.json()) as
        | { success: true; description: string }
        | { success: false; message: string; retryable: boolean };

      if (!data.success) {
        toast.error(data.message ?? "Failed to generate description.");
        return;
      }

      // Deliver the generated text to the parent form
      onDescriptionGenerated(data.description);
      toast.success("Description generated! Feel free to edit it.");
    } catch {
      // Network failure (fetch itself threw)
      toast.error(
        "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [storeId, formData, onDescriptionGenerated]);

  return { isGenerating, generateDescription };
}

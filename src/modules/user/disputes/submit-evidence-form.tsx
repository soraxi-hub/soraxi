"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_HINT,
  MAX_IMAGE_UPLOAD_COUNT,
} from "@/constants/image.constants";
import { useImageUpload } from "@/hooks/use-image-upload";
import { parseErrorFromResponse } from "@/lib/utils/parse-error-from-response";

interface SubmitEvidenceFormProps {
  orderId: string;
  disputeId: string;
}

/**
 * Evidence-only upload form for the AWAITING_EVIDENCE follow-up window.
 *
 * Mirrors DisputeDialog's image-upload UI (same hook, same preview grid,
 * same constants) since this is the same "attach photos" job — just posting
 * to a different endpoint and with no reason textarea, since the reason was
 * already given when the dispute was opened.
 */
export function SubmitEvidenceForm({
  orderId,
  disputeId,
}: SubmitEvidenceFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    files: images,
    previews,
    isProcessing: isProcessingImages,
    handleImageChange: handleImageSelect,
    removeImage: handleRemoveImage,
  } = useImageUpload();

  const handleSubmit = async () => {
    setError(null);

    if (!images.length) {
      setError("Please upload at least one photo as evidence.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("disputeId", disputeId);
      images.forEach((file) => formData.append("evidence", file));

      const response = await fetch("/api/disputes/submit-evidence", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { message } = await parseErrorFromResponse(response);
        setError(message);
        return;
      }

      router.push(`/orders/${orderId}/dispute/${disputeId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = images.length > 0 && !isProcessingImages;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Additional Photo Evidence{" "}
              <span className="text-destructive">*</span>
            </Label>
            <span className="text-xs text-muted-foreground">
              {images.length}/{MAX_IMAGE_UPLOAD_COUNT} photos
            </span>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((preview, index) => (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    disabled={submitting}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGE_UPLOAD_COUNT && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/50 hover:bg-muted transition-colors flex flex-col items-center justify-center gap-1"
                >
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add</span>
                </button>
              )}
            </div>
          )}

          {images.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="w-full h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Upload photos
                </p>
                <p className="text-xs text-muted-foreground">
                  Photos showing the issue
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {IMAGE_UPLOAD_HINT}
                </p>
              </div>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            multiple
            className="hidden"
            onChange={handleImageSelect}
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting || !isFormValid}
          className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
        >
          {submitting ? (
            <>
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Submitting...
            </>
          ) : (
            "Submit Evidence"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useRef } from "react";
import { Upload, X, ImageIcon, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DisputeDialogProps {
  open: boolean;
  setOpenAction: (open: boolean) => void;
  orderId: string;
  subOrderId: string;
  storeName: string;
  onSuccessAction: (disputeId: string) => void;
  submitting: boolean;
  setSubmittingAction: (submitting: boolean) => void;
}

const MAX_IMAGES = 5;
const MIN_REASON_LENGTH = 20;

export function DisputeDialog({
  open,
  setOpenAction,
  orderId,
  subOrderId,
  storeName,
  onSuccessAction,
  submitting,
  setSubmittingAction,
}: DisputeDialogProps) {
  const [reason, setReason] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    const selected = files.slice(0, remaining);

    // Generate previews
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setImages((prev) => [...prev, ...selected]);

    // Reset input so same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    if (submitting) return;
    setReason("");
    setImages([]);
    setPreviews([]);
    setError(null);
    setOpenAction(false);
  };

  const handleSubmit = async () => {
    setError(null);

    if (reason.trim().length < MIN_REASON_LENGTH) {
      setError(
        `Please provide a more detailed reason (at least ${MIN_REASON_LENGTH} characters).`,
      );
      return;
    }

    if (!images.length) {
      setError("Please upload at least one photo as evidence.");
      return;
    }

    setSubmittingAction(true);

    try {
      const formData = new FormData();
      formData.append("mainOrderId", orderId);
      formData.append("subOrderId", subOrderId);
      formData.append("reason", reason.trim());
      images.forEach((file) => formData.append("evidence", file));

      const response = await fetch("/api/disputes/open", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Failed to submit dispute. Please try again.");
        return;
      }

      handleClose();
      onSuccessAction(result.data.disputeId);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const reasonLength = reason.trim().length;
  const isReasonValid = reasonLength >= MIN_REASON_LENGTH;
  const isFormValid = isReasonValid && images.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg rounded-xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-base font-semibold">
                Raise a Dispute
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {storeName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Info banner */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Your payment for this order will be frozen while we investigate.
              Please provide as much detail as possible to help us resolve this
              quickly.
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="dispute-reason" className="text-sm font-medium">
                What went wrong? <span className="text-destructive">*</span>
              </Label>
              <span
                className={`text-xs tabular-nums ${
                  isReasonValid ? "text-soraxi-green" : "text-muted-foreground"
                }`}
              >
                {reasonLength}/{MIN_REASON_LENGTH}+
              </span>
            </div>
            <Textarea
              id="dispute-reason"
              placeholder="Describe the issue in detail — e.g. I received a completely different item than what I ordered. The item I received was black but I ordered red..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[110px] resize-none text-sm"
              disabled={submitting}
            />
          </div>

          {/* Evidence upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Photo Evidence <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {images.length}/{MAX_IMAGES} photos
              </span>
            </div>

            {/* Image previews */}
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

                {/* Add more slot */}
                {images.length < MAX_IMAGES && (
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

            {/* Upload button — shown when no images yet */}
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
                    Up to {MAX_IMAGES} photos showing the issue
                  </p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
              disabled={submitting}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t border-border flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !isFormValid}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
          >
            {submitting ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Submitting...
              </>
            ) : (
              "Submit Dispute"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

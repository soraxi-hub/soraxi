/**
 * Returns Dialog Component
 *
 * A modal dialog for initiating product returns with reason selection
 * and quantity specification for delivered products.
 *
 * @component ReturnsDialog
 */

"use client";

import { useState } from "react";
import { Loader, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReturnsDialogProps {
  open: boolean;
  setOpenAction: (open: boolean) => void;
  product: {
    _id: string;
    name: string;
    quantity: number;
    images?: string[];
  } | null;
  onSubmitAction: (returnData: {
    productId: string;
    quantity: number;
    reason: string;
    description: string;
  }) => Promise<void>;
  submitting: boolean;
}

const RETURN_REASONS = [
  "Defective/Damaged",
  "Wrong Item Received",
  "Not as Described",
  "Size/Fit Issues",
  "Changed Mind",
  "Quality Issues",
  "Other",
];

export function ReturnsDialog({
  open,
  setOpenAction,
  product,
  onSubmitAction,
  submitting,
}: ReturnsDialogProps) {
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!product || !returnReason.trim()) return;

    await onSubmitAction({
      productId: product._id,
      quantity: returnQuantity,
      reason: returnReason,
      description: description.trim(),
    });

    // Reset form
    setReturnQuantity(1);
    setReturnReason("");
    setDescription("");
  };

  const handleClose = () => {
    setOpenAction(false);
    // Reset form when closing
    setReturnQuantity(1);
    setReturnReason("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Request Return
          </DialogTitle>
          <DialogDescription>
            {product && `Request a return for "${product.name}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to Return</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={product?.quantity || 1}
              value={returnQuantity}
              onChange={(e) =>
                setReturnQuantity(
                  Math.max(
                    1,
                    Math.min(
                      product?.quantity || 1,
                      Number.parseInt(e.target.value) || 1
                    )
                  )
                )
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {product?.quantity || 0} item
              {(product?.quantity || 0) > 1 ? "s" : ""}
            </p>
          </div>

          {/* Return Reason */}
          <div className="space-y-2">
            <Label>Return Reason</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason for return" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide any additional details about the issue..."
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Help us understand the issue better to process your return quickly
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || !returnReason.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {submitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Request Return"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

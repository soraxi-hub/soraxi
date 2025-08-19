"use client";

/**
 * Review Dialog Component
 *
 * A modal dialog for submitting product reviews with star rating
 * and text feedback.
 *
 * @component ReviewDialog
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.setOpen - Function to set the open state
 * @param {number} props.rating - The current rating value
 * @param {Function} props.setRating - Function to set the rating
 * @param {string} props.review - The review text
 * @param {Function} props.setReview - Function to set the review text
 * @param {Function} props.onSubmit - Function to handle form submission
 * @param {boolean} props.submitting - Whether the form is currently submitting
 */

import { Loader, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReviewDialogProps {
  open: boolean;
  setOpenAction: (open: boolean) => void;
  rating: number;
  setRatingAction: (rating: number) => void;
  review: string;
  setReviewAction: (review: string) => void;
  onSubmitAction: () => Promise<void>;
  submitting: boolean;
}

export function ReviewDialog({
  open,
  setOpenAction,
  rating,
  setRatingAction,
  review,
  setReviewAction,
  onSubmitAction,
  submitting,
}: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpenAction}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Write a Product Review</DialogTitle>
          <DialogDescription>
            Share your experience with this product to help other shoppers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Rating</label>
            <div className="flex justify-center gap-2">
              {[...Array(5)].map((_, i) => {
                const value = i + 1;
                return (
                  <button
                    key={value}
                    onClick={() => setRatingAction(value)}
                    className="focus:outline-hidden transition-transform hover:scale-110"
                    aria-label={`Rate ${value} stars`}
                    type="button"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        value <= rating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="review" className="text-sm font-medium">
              Your Review
            </label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReviewAction(e.target.value)}
              placeholder="What did you like or dislike? How was your experience with this product?"
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your review helps other shoppers make informed decisions
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenAction(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-soraxi-green hover:bg-soraxi-green/85 text-white"
            onClick={onSubmitAction}
            disabled={submitting || !rating || !review.trim()}
          >
            {submitting ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

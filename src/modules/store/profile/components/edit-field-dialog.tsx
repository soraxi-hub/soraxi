"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  /** Current stored value. Reset into the field each time the dialog opens. */
  value: string;
  multiline?: boolean;
  maxLength?: number;
  /** Shown as `n/min` and blocks saving until reached. */
  minLength?: number;
  isSaving: boolean;
  onSave: (value: string) => void;
}

/**
 * One dialog for editing one field.
 */
export function EditFieldDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  value,
  multiline = false,
  maxLength,
  minLength,
  isSaving,
  onSave,
}: EditFieldDialogProps) {
  const [draft, setDraft] = useState(value);

  // Re-seed on open, so cancelling and reopening shows the saved value rather
  // than the abandoned edit.
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const trimmed = draft.trim();
  const tooShort = Boolean(minLength && trimmed.length < minLength);
  const unchanged = trimmed === value.trim();
  const canSave = !tooShort && !unchanged && trimmed.length > 0 && !isSaving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="edit-field">{label}</Label>
            {minLength && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  tooShort ? "text-muted-foreground" : "text-soraxi-green",
                )}
              >
                {trimmed.length}/{minLength} min
              </span>
            )}
          </div>

          {multiline ? (
            <Textarea
              id="edit-field"
              rows={6}
              value={draft}
              maxLength={maxLength}
              disabled={isSaving}
              onChange={(event) => setDraft(event.target.value)}
              className="resize-none"
            />
          ) : (
            <Input
              id="edit-field"
              value={draft}
              maxLength={maxLength}
              disabled={isSaving}
              onChange={(event) => setDraft(event.target.value)}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(trimmed)}
            disabled={!canSave}
            className="gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
          >
            {isSaving && <Spinner className="size-4" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

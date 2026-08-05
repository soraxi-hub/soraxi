"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ProductRefView } from "@/domain/messaging/messaging-types";
import { ProductRefCard } from "./reference-cards";

interface ComposerProps {
  placeholder: string;
  quickReplies: string[];
  /** Product the next message will carry, if the user attached one. */
  attachment?: ProductRefView;
  onClearAttachment?: () => void;
  isSending: boolean;
  onSend: (body: string) => void;
}

/**
 * The message input, its quick replies and any attached product.
 *
 * Quick replies send immediately rather than filling the input: they exist to
 * turn a common reply into one tap, and making them a two-step action would
 * defeat the point.
 */
export function Composer({
  placeholder,
  quickReplies,
  attachment,
  onClearAttachment,
  isSending,
  onSend,
}: ComposerProps) {
  const [value, setValue] = useState("");

  const submit = (body: string) => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;

    onSend(trimmed);
    setValue("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(value);
  };

  // Enter sends, Shift+Enter would newline — but this is a single-line input,
  // so Enter submitting via the form is already the behaviour. Handled
  // explicitly so the intent survives a future switch to a textarea.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(value);
    }
  };

  return (
    <div className="border-t border-border bg-background">
      {quickReplies.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-0 pt-3 pb-1 sm:px-4">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              type="button"
              disabled={isSending}
              onClick={() => submit(reply)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-soraxi-green hover:text-soraxi-green disabled:opacity-50"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {attachment && (
        <div className="flex items-center gap-2 px-0 pt-2 sm:px-4">
          <span className="shrink-0 text-xs text-muted-foreground">
            Asking about
          </span>
          <div className="min-w-0 flex-1">
            <ProductRefCard product={attachment} compact />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClearAttachment}
            aria-label="Remove attached product"
            className="size-8 shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 py-2 sm:p-4"
      >
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Message"
          disabled={isSending}
          className="flex-1 rounded-full"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isSending || !value.trim()}
          aria-label="Send message"
          className="size-10 shrink-0 rounded-lg bg-soraxi-green text-white hover:bg-soraxi-green-hover"
        >
          {isSending ? (
            <Spinner className="size-4" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

/**
 * Replaces the composer when a thread can no longer be written to.
 *
 * The history stays visible above it — someone whose vendor was suspended still
 * needs to read what was agreed.
 */
export function LockedNotice({ reason }: { reason: string }) {
  return (
    <div className="border-t border-border bg-muted/40 px-4 py-5 text-center">
      <p className="text-sm text-muted-foreground">{reason}</p>
    </div>
  );
}

"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { ProductRefView } from "@/domain/messaging/messaging-types";
import { ProductRefCard } from "./reference-cards";

/** Textarea stops growing here and scrolls internally instead — about 4-5 lines. */
const MAX_COMPOSER_HEIGHT_PX = 128;

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

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

  // Desktop: Enter sends, Shift+Enter inserts a newline. Mobile: Enter always
  // inserts a newline (that's the textarea's default — nothing to do here),
  // and only the send button submits.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMobile) return;

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit(value);
    }
  };

  // Auto-grow with the content, up to the cap, then scroll internally.
  // useLayoutEffect so the resize happens before paint — no flash at the old
  // height. Also what resets the box back to one row once `value` clears
  // after a send.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, MAX_COMPOSER_HEIGHT_PX);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > MAX_COMPOSER_HEIGHT_PX ? "auto" : "hidden";
  }, [value]);

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
        className="flex items-end gap-2 py-2 sm:p-4"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Message"
          disabled={isSending}
          className={cn(
            "flex-1 resize-none rounded-md border border-gray-300 px-3 py-1.5",
            "text-base text-foreground placeholder:text-muted-foreground",
            "shadow-xs outline-none transition-[color,box-shadow,border-color]",
            "hover:border-soraxi-green focus:border-soraxi-green",
            "focus-visible:ring-[1px] focus-visible:ring-soraxi-green/20",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        <Button
          type="submit"
          size="icon"
          disabled={isSending || !value.trim()}
          aria-label="Send message"
          className="size-9 shrink-0 rounded-lg bg-soraxi-green text-white hover:bg-soraxi-green-hover"
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

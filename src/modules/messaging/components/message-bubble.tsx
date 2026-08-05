"use client";

import { Check, CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MessageView } from "@/domain/messaging/messaging-types";
import { formatClockTime } from "../messaging-format";
import { ReferenceCard } from "./reference-cards";

/**
 * A platform notice — escrow reminders, dispute updates.
 *
 * Centred and visually distinct from both sides' bubbles, because attributing
 * it to either party would be actively misleading.
 */
export function SystemNotice({ body }: { body: string }) {
  return (
    <div className="flex justify-center px-0 sm:px-4 py-2">
      <p className="max-w-md rounded-lg bg-soraxi-green/10 px-3 py-2 text-center text-xs text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

/** The date separator between days of conversation. */
export function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 sm:px-4 py-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/**
 * One message.
 *
 * Own messages sit right in green, the counterpart's left in muted grey — the
 * convention every messaging app shares, and worth not being clever about.
 *
 * Read receipts appear only on own messages: a tick on something you received
 * would be telling you what you already know.
 */
export function MessageBubble({ message }: { message: MessageView }) {
  if (message.systemType) {
    return <SystemNotice body={message.body} />;
  }

  const { isOwn } = message;
  const hasReference = Boolean(message.product || message.order);

  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-0 sm:px-4 py-1",
        isOwn ? "items-end" : "items-start",
      )}
    >
      {/* A reference sits above its message, as its subject rather than part
          of the sentence — so it stays unstyled by the bubble's colour. */}
      {hasReference && (
        <div className="mb-1 w-full max-w-[min(20rem,85%)]">
          <ReferenceCard product={message.product} order={message.order} />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2 text-sm break-words sm:max-w-[70%]",
          isOwn ? "bg-soraxi-green text-white" : "bg-muted text-foreground",
        )}
      >
        {/* Plain text, never HTML: message bodies are arbitrary input from
            another user and must never be interpreted as markup. */}
        <p className="whitespace-pre-wrap">{message.body}</p>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 px-1 text-[11px] text-muted-foreground",
          isOwn ? "flex-row" : "flex-row-reverse",
        )}
      >
        <span>{formatClockTime(message.createdAt)}</span>
        {isOwn &&
          (message.isRead ? (
            <CheckCheck
              className="size-3.5 text-soraxi-green"
              aria-label="Read"
            />
          ) : (
            <Check className="size-3.5" aria-label="Sent" />
          ))}
      </div>
    </div>
  );
}

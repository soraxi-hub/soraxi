import type { MessageOutboxEventEnum } from "@/enums";

import { AppendSystemMessageHandler } from "./append-system-message.handler";
import { NotifyRecipientHandler } from "./notify-recipient.handler";
import type { OutboxHandler } from "./types";

/**
 * The outbox handler registry.
 *
 * **This list is the extension point for the entire messaging system.** Push
 * notifications, digest emails, moderation scanning, analytics webhooks — each
 * is a new handler added here. The message send path is never touched again.
 *
 * Order is not significant: handlers for the same event run independently, and
 * one failing does not prevent the others from having run.
 */
const HANDLERS: OutboxHandler[] = [
  new NotifyRecipientHandler(),
  new AppendSystemMessageHandler(),
];

export function handlersFor(type: MessageOutboxEventEnum): OutboxHandler[] {
  return HANDLERS.filter((handler) => handler.handles.includes(type));
}

export type { OutboxHandler } from "./types";

import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  MessageParticipantKindEnum,
  MessageReportReasonEnum,
  MessageScopeKindEnum,
} from "@/enums";
import type { MessagingIdentity } from "@/domain/messaging/messaging-types";
import type { Context } from "@/trpc/init";

/**
 * Shared input shapes and identity resolution for the messaging routers.
 *
 * Customers and vendors get separate routers — the same split the dispute
 * feature uses — because the guard differs and the two sides should not be able
 * to reach each other's procedures by passing a different id.
 */

export const inboxInput = z.object({
  scopeKind: z.nativeEnum(MessageScopeKindEnum).optional(),
  unreadOnly: z.boolean().optional(),
  /** ISO timestamp of the last row already shown. */
  cursor: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const threadInput = z.object({
  conversationId: z.string(),
  /** `_id` of the oldest message already shown. */
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export const sendMessageInput = z.object({
  conversationId: z.string(),
  body: z.string().min(1).max(4000),
  /** Product attached to this message alone, not the thread. */
  attachProductId: z.string().optional(),
});

export const conversationIdInput = z.object({
  conversationId: z.string(),
});

export const reportConversationInput = z.object({
  conversationId: z.string(),
  reason: z.nativeEnum(MessageReportReasonEnum),
  /** Optional free-text detail. Capped to keep the queue readable. */
  note: z.string().max(1000).optional(),
  /** The specific message being reported, when the reporter picked one. */
  messageId: z.string().optional(),
});

/**
 * The signed-in customer, as a messaging identity.
 *
 * @throws when there is no user session
 */
export function requireCustomer(ctx: Context): MessagingIdentity {
  if (!ctx.user?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to view your messages",
    });
  }

  return { kind: MessageParticipantKindEnum.User, id: ctx.user.id };
}

/**
 * The signed-in store, as a messaging identity.
 *
 * @throws when there is no store session
 */
export function requireStore(ctx: Context): MessagingIdentity {
  if (!ctx.store?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to your store to view messages",
    });
  }

  return { kind: MessageParticipantKindEnum.Store, id: ctx.store.id };
}

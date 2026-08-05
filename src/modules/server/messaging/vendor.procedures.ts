import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { messagingService } from "@/services/messaging/messaging.service";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";

import {
  conversationIdInput,
  inboxInput,
  reportConversationInput,
  requireStore,
  sendMessageInput,
  threadInput,
} from "./shared";

/**
 * Messaging procedures for the vendor side.
 *
 * Identity comes from the store session, so a vendor cannot read another
 * store's inbox by changing a parameter.
 *
 * There is deliberately **no `openProductThread` here**. A vendor cold-messaging
 * someone who merely browsed a product is spam, and the asymmetry costs nothing
 * to enforce: vendors reply to enquiries, and may open threads on orders, where
 * they have a legitimate reason to make contact.
 */
export const vendorMessagingRouter = createTRPCRouter({
  openOrderThread: baseProcedure
    .input(z.object({ subOrderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);

        return await messagingService.openOrderThread({
          subOrderId: input.subOrderId,
          initiator: store,
        });
      } catch (error) {
        await reportIfNeeded(error, "vendorMessaging.openOrderThread");
        throw handleTRPCError(error, "Could not start this conversation");
      }
    }),

  listInbox: baseProcedure.input(inboxInput).query(async ({ input, ctx }) => {
    try {
      const store = requireStore(ctx);

      return await messagingService.listInbox({
        viewer: store,
        scopeKind: input.scopeKind,
        unreadOnly: input.unreadOnly,
        cursor: input.cursor ? new Date(input.cursor) : undefined,
        limit: input.limit,
      });
    } catch (error) {
      await reportIfNeeded(error, "vendorMessaging.listInbox");
      throw handleTRPCError(error, "Could not load your messages");
    }
  }),

  getThread: baseProcedure.input(threadInput).query(async ({ input, ctx }) => {
    try {
      const store = requireStore(ctx);

      return await messagingService.getThread({
        conversationId: input.conversationId,
        viewer: store,
        cursor: input.cursor,
        limit: input.limit,
      });
    } catch (error) {
      await reportIfNeeded(error, "vendorMessaging.getThread");
      throw handleTRPCError(error, "Could not load this conversation");
    }
  }),

  sendMessage: baseProcedure
    .input(sendMessageInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);

        return await messagingService.sendMessage({
          conversationId: input.conversationId,
          sender: store,
          body: input.body,
          attachProductId: input.attachProductId,
        });
      } catch (error) {
        await reportIfNeeded(error, "vendorMessaging.sendMessage");
        throw handleTRPCError(error, "Could not send your message");
      }
    }),

  markRead: baseProcedure
    .input(conversationIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);

        await messagingService.markRead({
          conversationId: input.conversationId,
          viewer: store,
        });

        return { success: true };
      } catch (error) {
        await reportIfNeeded(error, "vendorMessaging.markRead");
        throw handleTRPCError(error, "Could not update this conversation");
      }
    }),

  totalUnread: baseProcedure.query(async ({ ctx }) => {
    try {
      const store = requireStore(ctx);
      return { total: await messagingService.totalUnread(store) };
    } catch (error) {
      await reportIfNeeded(error, "vendorMessaging.totalUnread");
      throw handleTRPCError(error, "Could not load your unread count");
    }
  }),

  /**
   * Flags a conversation for moderator review.
   *
   * Available to vendors as well as customers: harassment and scam attempts run
   * in both directions, and a vendor with no way to report one is a vendor who
   * eventually stops using the channel.
   */
  reportConversation: baseProcedure
    .input(reportConversationInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const store = requireStore(ctx);

        await messagingService.reportConversation({
          conversationId: input.conversationId,
          reporter: store,
          reason: input.reason,
          note: input.note,
          messageId: input.messageId,
        });

        return { success: true };
      } catch (error) {
        await reportIfNeeded(error, "vendorMessaging.reportConversation");
        throw handleTRPCError(error, "Could not submit your report");
      }
    }),
});

async function reportIfNeeded(error: unknown, source: string): Promise<void> {
  if (!isReportableError(error)) return;

  try {
    await sendTelegramMessage(formatErrorReport(error, { source }));
  } catch {
    // sendTelegramMessage logs internally; never mask the original error.
  }
}

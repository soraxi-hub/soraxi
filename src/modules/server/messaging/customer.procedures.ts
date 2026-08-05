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
  requireCustomer,
  sendMessageInput,
  threadInput,
} from "./shared";

/**
 * Messaging procedures for the customer side.
 *
 * Every procedure derives the caller's identity from the session — no procedure
 * accepts a participant id from the client, so a customer cannot read or write
 * another customer's threads by changing a parameter.
 */
export const customerMessagingRouter = createTRPCRouter({
  /** Opens a product enquiry, or returns the existing thread for that product. */
  openProductThread: baseProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const customer = requireCustomer(ctx);

        return await messagingService.openProductThread({
          customerId: customer.id,
          productId: input.productId,
        });
      } catch (error) {
        await reportIfNeeded(error, "customerMessaging.openProductThread");
        throw handleTRPCError(error, "Could not start this conversation");
      }
    }),

  /** Opens a thread about one of the caller's own sub-orders. */
  openOrderThread: baseProcedure
    .input(z.object({ subOrderId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const customer = requireCustomer(ctx);

        return await messagingService.openOrderThread({
          subOrderId: input.subOrderId,
          initiator: customer,
        });
      } catch (error) {
        await reportIfNeeded(error, "customerMessaging.openOrderThread");
        throw handleTRPCError(error, "Could not start this conversation");
      }
    }),

  listInbox: baseProcedure.input(inboxInput).query(async ({ input, ctx }) => {
    try {
      const customer = requireCustomer(ctx);

      return await messagingService.listInbox({
        viewer: customer,
        scopeKind: input.scopeKind,
        unreadOnly: input.unreadOnly,
        cursor: input.cursor ? new Date(input.cursor) : undefined,
        limit: input.limit,
      });
    } catch (error) {
      await reportIfNeeded(error, "customerMessaging.listInbox");
      throw handleTRPCError(error, "Could not load your messages");
    }
  }),

  getThread: baseProcedure.input(threadInput).query(async ({ input, ctx }) => {
    try {
      const customer = requireCustomer(ctx);

      return await messagingService.getThread({
        conversationId: input.conversationId,
        viewer: customer,
        cursor: input.cursor,
        limit: input.limit,
      });
    } catch (error) {
      await reportIfNeeded(error, "customerMessaging.getThread");
      throw handleTRPCError(error, "Could not load this conversation");
    }
  }),

  sendMessage: baseProcedure
    .input(sendMessageInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const customer = requireCustomer(ctx);

        return await messagingService.sendMessage({
          conversationId: input.conversationId,
          sender: customer,
          body: input.body,
          attachProductId: input.attachProductId,
        });
      } catch (error) {
        await reportIfNeeded(error, "customerMessaging.sendMessage");
        throw handleTRPCError(error, "Could not send your message");
      }
    }),

  markRead: baseProcedure
    .input(conversationIdInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const customer = requireCustomer(ctx);

        await messagingService.markRead({
          conversationId: input.conversationId,
          viewer: customer,
        });

        return { success: true };
      } catch (error) {
        await reportIfNeeded(error, "customerMessaging.markRead");
        throw handleTRPCError(error, "Could not update this conversation");
      }
    }),

  /** The "N new" badge. Polled far less often than an open thread. */
  totalUnread: baseProcedure.query(async ({ ctx }) => {
    try {
      const customer = requireCustomer(ctx);
      return { total: await messagingService.totalUnread(customer) };
    } catch (error) {
      await reportIfNeeded(error, "customerMessaging.totalUnread");
      throw handleTRPCError(error, "Could not load your unread count");
    }
  }),

  /**
   * Flags a conversation for moderator review.
   *
   * Does not lock the thread — an accusation is not a finding, and a report
   * button that silences the other party would be its own abuse vector.
   */
  reportConversation: baseProcedure
    .input(reportConversationInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const customer = requireCustomer(ctx);

        await messagingService.reportConversation({
          conversationId: input.conversationId,
          reporter: customer,
          reason: input.reason,
          note: input.note,
          messageId: input.messageId,
        });

        return { success: true };
      } catch (error) {
        await reportIfNeeded(error, "customerMessaging.reportConversation");
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

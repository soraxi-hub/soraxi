import { NotificationFactory } from "@/domain/notification";
import { MessageOutboxEventEnum } from "@/enums";
import type { IMessageOutboxEvent } from "@/lib/db/models/message-outbox.model";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { MessageRepository } from "@/repositories/message.repository";
import { siteConfig } from "@/config/site";

import { IdentityContactService } from "../boundary/identity-contact.service";
import type { OutboxHandler } from "./types";

/**
 * How far back to look when deciding whether a recipient is "active" in a
 * thread. If they have sent anything themselves in this window, they are
 * plainly reading it and do not need an email.
 */
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;

/**
 * Emails the recipient of a new message.
 *
 * Two rules keep this from becoming the reason people mute their notifications:
 *
 * 1. **Nothing is sent to someone already active in the thread.** If they have
 *    replied within the last ten minutes, they are looking at it.
 * 2. **Nothing is sent if they have already read the message.** The event is
 *    deliberately delayed a minute before it becomes drainable, so the common
 *    case — a reply read almost immediately — produces no email at all.
 *
 * Idempotent: re-running it for an already-read message correctly sends
 * nothing, which is what at-least-once delivery requires.
 */
export class NotifyRecipientHandler implements OutboxHandler {
  readonly name = "notify-recipient";
  readonly handles = [MessageOutboxEventEnum.MessageSent];

  async handle(event: IMessageOutboxEvent): Promise<void> {
    const { conversationId, messageId, senderId } = event.payload as {
      conversationId: string;
      messageId: string;
      senderId: string;
    };

    const [conversation, message] = await Promise.all([
      ConversationRepository.findById(conversationId),
      MessageRepository.findById(messageId),
    ]);

    // The conversation or message was deleted between enqueue and drain.
    // Nothing to do, and nothing worth retrying.
    if (!conversation || !message) return;

    const recipient = ConversationRepository.counterpartOf(
      conversation,
      senderId,
    );

    if (!recipient) return;

    // Already read it — the delay did its job.
    if (
      recipient.lastReadAt &&
      new Date(recipient.lastReadAt).getTime() >=
        new Date(message.createdAt).getTime()
    ) {
      return;
    }

    // Actively participating — they don't need telling.
    const isActive = await MessageRepository.hasActivitySince({
      conversationId,
      senderId: recipient.id.toString(),
      since: new Date(Date.now() - ACTIVE_WINDOW_MS),
    });

    if (isActive) return;

    const contact = await IdentityContactService.resolve(
      recipient.kind,
      recipient.id,
    );

    if (!contact) return;

    const sender = ConversationRepository.participantOf(conversation, senderId);
    const senderName = sender?.snapshot.name ?? "Someone";

    const notification = NotificationFactory.create("email", {
      recipient: contact.email,
      subject: `New message from ${senderName}`,
      emailType: "noreply",
      fromAddress: "noreply@soraxihub.com",
      html: this.renderHtml({
        recipientName: contact.name,
        senderName,
        preview: message.body,
      }),
      text: `${senderName} sent you a message on ${siteConfig.name}: "${truncate(message.body, 200)}"`,
    });

    await notification.send();
  }

  /**
   * Minimal inline HTML rather than a react-email template.
   *
   * The message body is escaped, not rendered: it is arbitrary text from
   * another user, and a notification email is exactly the wrong place to let
   * one user inject markup into another's inbox.
   */
  private renderHtml({
    recipientName,
    senderName,
    preview,
  }: {
    recipientName: string;
    senderName: string;
    preview: string;
  }): string {
    return `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <p>Hi ${escapeHtml(recipientName)},</p>
        <p><strong>${escapeHtml(senderName)}</strong> sent you a message on ${escapeHtml(siteConfig.name)}:</p>
        <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #14a800;background:#f6f6f6;color:#333">
          ${escapeHtml(truncate(preview, 300))}
        </blockquote>
        <p style="color:#666;font-size:14px">Sign in to reply.</p>
      </div>
    `;
  }
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

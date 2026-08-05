import mongoose, { type ClientSession } from "mongoose";

import { getMessageModel, type IMessage } from "@/lib/db/models/message.model";

/**
 * Persistence for messages.
 *
 * Every read is served by the `{ conversationId: 1, _id: -1 }` index, and
 * pagination is always cursor-based on `_id`.
 */
export class MessageRepository {
  /**
   * One page of thread history, newest first.
   *
   * Cursor-paginated on `_id` rather than `skip`: ObjectIds increase
   * monotonically, so `{ _id: { $lt: cursor } }` is an index range scan that
   * costs the same at message 900 as at message 10. `skip(900)` would walk 900
   * documents server-side on every request.
   *
   * @param cursor - `_id` of the oldest message already shown
   */
  static async listByConversation({
    conversationId,
    cursor,
    limit = 30,
  }: {
    conversationId: string;
    cursor?: string;
    limit?: number;
  }): Promise<IMessage[]> {
    const Message = await getMessageModel();

    const filter: Record<string, unknown> = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };

    if (cursor) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    return Message.find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .lean<IMessage[]>();
  }

  static async create(
    message: Omit<IMessage, "_id" | "createdAt" | "updatedAt">,
    session?: ClientSession,
  ): Promise<IMessage> {
    const Message = await getMessageModel();

    const [created] = await Message.create([message], {
      session: session ?? undefined,
    });

    return created.toObject() as IMessage;
  }

  static async findById(messageId: string): Promise<IMessage | null> {
    const Message = await getMessageModel();
    return Message.findById(messageId).lean<IMessage>();
  }

  /**
   * Whether a system notice for a given outbox event is already in a thread.
   *
   * The outbox drain is at-least-once, so a handler that posted its notice and
   * then died before marking the event done will be handed the same event
   * again. Without this check the thread would accumulate duplicate notices
   * every time a function was killed at the wrong moment.
   */
  static async existsBySourceEvent(
    conversationId: string,
    sourceEventId: string,
  ): Promise<boolean> {
    const Message = await getMessageModel();

    const count = await Message.countDocuments({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      sourceEventId: new mongoose.Types.ObjectId(sourceEventId),
    }).limit(1);

    return count > 0;
  }

  /**
   * Whether an identity has sent anything in a thread since a given moment.
   *
   * Used by the notification handler to suppress email to someone who is
   * already active in the conversation — the difference between a useful alert
   * and the reason people mute you.
   */
  static async hasActivitySince({
    conversationId,
    senderId,
    since,
  }: {
    conversationId: string;
    senderId: string;
    since: Date;
  }): Promise<boolean> {
    const Message = await getMessageModel();

    const count = await Message.countDocuments({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      "sender.id": new mongoose.Types.ObjectId(senderId),
      createdAt: { $gte: since },
    }).limit(1);

    return count > 0;
  }
}

import mongoose, { type ClientSession } from "mongoose";

import {
  getConversationModel,
  type IConversation,
  type IConversationParticipant,
} from "@/lib/db/models/conversation.model";
import {
  ConversationStatusEnum,
  MessageParticipantKindEnum,
  MessageScopeKindEnum,
} from "@/enums";

/**
 * Persistence for conversations.
 *
 * This is the only place MongoDB query syntax for conversations appears —
 * services and procedures call these methods and never build filters
 * themselves. Every read here is designed to be served by one of the three
 * indexes declared on the schema.
 */
export class ConversationRepository {
  /**
   * Finds an existing thread between this identity and this scope target.
   *
   * Used to reopen rather than duplicate: a customer enquiring twice about the
   * same product lands back in the thread they already have. Served by the
   * `{ "scope.refId": 1, "participants.id": 1 }` index.
   */
  static async findByScopeForParticipant(
    scopeRefId: string,
    participantId: string,
  ): Promise<IConversation | null> {
    const Conversation = await getConversationModel();

    return Conversation.findOne({
      "scope.refId": new mongoose.Types.ObjectId(scopeRefId),
      "participants.id": new mongoose.Types.ObjectId(participantId),
    }).lean<IConversation>();
  }

  /**
   * Every conversation attached to a scope reference, regardless of who is in
   * it.
   *
   * Used by the system-message handler, which asks "does a thread already exist
   * for this sub-order?" without knowing or caring who the participants are.
   * Deliberately returns a list: a sub-order has one thread today, but nothing
   * in the model guarantees that, and silently taking the first would be a bug
   * waiting to happen.
   */
  static async findByScopeRef(scopeRefId: string): Promise<IConversation[]> {
    const Conversation = await getConversationModel();

    return Conversation.find({
      "scope.refId": new mongoose.Types.ObjectId(scopeRefId),
    }).lean<IConversation[]>();
  }

  static async findById(
    conversationId: string,
    session?: ClientSession,
  ): Promise<IConversation | null> {
    const Conversation = await getConversationModel();

    return Conversation.findById(conversationId)
      .session(session ?? null)
      .lean<IConversation>();
  }

  /**
   * Inbox listing for one identity, newest activity first.
   *
   * Cursor-paginated on `lastMessageAt` rather than `skip`/`limit`, so deep
   * pages cost what shallow ones do.
   *
   * @param scopeKind - Optional filter backing the Products / Orders tabs
   * @param unreadOnly - Backs the Unread tab
   * @param cursor - `lastMessageAt` of the last row already shown
   */
  static async listForParticipant({
    participantId,
    scopeKind,
    unreadOnly = false,
    cursor,
    limit = 20,
  }: {
    participantId: string;
    scopeKind?: MessageScopeKindEnum;
    unreadOnly?: boolean;
    cursor?: Date;
    limit?: number;
  }): Promise<IConversation[]> {
    const Conversation = await getConversationModel();
    const id = new mongoose.Types.ObjectId(participantId);

    const filter: Record<string, unknown> = {
      "participants.id": id,
      status: { $ne: ConversationStatusEnum.Archived },
    };

    if (scopeKind) filter["scope.kind"] = scopeKind;
    if (cursor) filter.lastMessageAt = { $lt: cursor };

    // Unread is expressed as an $elemMatch so the count and the id must belong
    // to the *same* participant entry — otherwise a thread would look unread to
    // one side because the other side has unread messages.
    if (unreadOnly) {
      filter.participants = { $elemMatch: { id, unreadCount: { $gt: 0 } } };
    }

    return Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .lean<IConversation[]>();
  }

  /**
   * Total unread messages across all of an identity's threads — the "N new"
   * badge. Reads denormalised counters, so it never touches the messages
   * collection.
   */
  static async totalUnreadForParticipant(
    participantId: string,
  ): Promise<number> {
    const Conversation = await getConversationModel();
    const id = new mongoose.Types.ObjectId(participantId);

    const [result] = await Conversation.aggregate<{ total: number }>([
      { $match: { "participants.id": id } },
      { $unwind: "$participants" },
      { $match: { "participants.id": id } },
      { $group: { _id: null, total: { $sum: "$participants.unreadCount" } } },
    ]);

    return result?.total ?? 0;
  }

  static async create(
    conversation: Omit<IConversation, "_id" | "createdAt" | "updatedAt">,
    session?: ClientSession,
  ): Promise<IConversation> {
    const Conversation = await getConversationModel();

    const [created] = await Conversation.create([conversation], {
      session: session ?? undefined,
    });

    return created.toObject() as IConversation;
  }

  /**
   * Records a new message against the conversation: bumps the activity
   * timestamp and preview, and increments the unread counter for everyone
   * except the sender.
   *
   * Runs inside the send transaction. The positional-filtered `$inc` keeps this
   * a single atomic update rather than a read-modify-write, so concurrent sends
   * cannot lose a count.
   */
  static async recordNewMessage(
    {
      conversationId,
      senderId,
      preview,
      sentAt,
    }: {
      conversationId: string;
      senderId: string;
      preview: string;
      sentAt: Date;
    },
    session?: ClientSession,
  ): Promise<void> {
    const Conversation = await getConversationModel();

    await Conversation.updateOne(
      { _id: new mongoose.Types.ObjectId(conversationId) },
      {
        $set: { lastMessageAt: sentAt, lastMessagePreview: preview },
        $inc: { "participants.$[other].unreadCount": 1 },
      },
      {
        session: session ?? undefined,
        arrayFilters: [
          { "other.id": { $ne: new mongoose.Types.ObjectId(senderId) } },
        ],
      },
    );
  }

  /**
   * Marks a thread read for one participant: clears their counter and stamps
   * `lastReadAt`, which is what read receipts on the other side are derived
   * from.
   */
  static async markRead(
    conversationId: string,
    participantId: string,
  ): Promise<void> {
    const Conversation = await getConversationModel();

    await Conversation.updateOne(
      { _id: new mongoose.Types.ObjectId(conversationId) },
      {
        $set: {
          "participants.$[me].unreadCount": 0,
          "participants.$[me].lastReadAt": new Date(),
        },
      },
      {
        arrayFilters: [
          { "me.id": new mongoose.Types.ObjectId(participantId) },
        ],
      },
    );
  }

  static async setStatus(
    conversationId: string,
    status: ConversationStatusEnum,
    lockedReason?: string,
  ): Promise<void> {
    const Conversation = await getConversationModel();

    await Conversation.updateOne(
      { _id: new mongoose.Types.ObjectId(conversationId) },
      {
        $set: {
          status,
          ...(lockedReason !== undefined ? { lockedReason } : {}),
        },
      },
    );
  }

  /**
   * Locks or unlocks a store's threads.
   *
   * Threads stay readable either way — only the composer is replaced by the
   * lock notice. Someone whose vendor was suspended still needs to read what
   * was agreed.
   *
   * @param scopeKind - Restricts the change to one scope. Suspension passes
   *   `Product` deliberately: **order threads must stay open.** The public
   *   storefront tells customers "orders you already placed are unaffected",
   *   and locking the thread for an order with money still in escrow would
   *   break that promise and strand them with no way to chase a delivery.
   *   Reinstatement passes the same filter, so only what was locked reopens.
   */
  static async setStatusForStore(
    storeId: string,
    status: ConversationStatusEnum,
    lockedReason?: string,
    scopeKind?: MessageScopeKindEnum,
  ): Promise<number> {
    const Conversation = await getConversationModel();

    const result = await Conversation.updateMany(
      {
        participants: {
          $elemMatch: {
            kind: MessageParticipantKindEnum.Store,
            id: new mongoose.Types.ObjectId(storeId),
          },
        },
        ...(scopeKind ? { "scope.kind": scopeKind } : {}),
      },
      {
        $set: {
          status,
          // Reopening must clear the stale reason, or an unlocked thread keeps
          // a "this store is suspended" string it will never show again.
          ...(lockedReason !== undefined
            ? { lockedReason }
            : { lockedReason: "" }),
        },
      },
    );

    return result.modifiedCount;
  }

  /**
   * Anonymises an identity across every conversation they appear in.
   *
   * ─────────────────────────────────────────────────────────────────────────
   * THE ACCOUNT-DELETION POLICY, IMPLEMENTED
   * ─────────────────────────────────────────────────────────────────────────
   * Deleting an account replaces the participant's *snapshot* — the name and
   * institution shown in inboxes and headers — while message bodies survive.
   *
   * The alternative, erasing everything they wrote, blows holes in the other
   * party's threads and destroys dispute evidence, including in cases where the
   * departing user was the one at fault. Retaining the transcript of a
   * completed transaction is defensible under NDPR as a legitimate interest;
   * retaining someone's *name and institution* against their wishes is much
   * harder to argue. This draws the line between the two.
   *
   * NOTE: nothing calls this yet — the platform has no account-deletion flow.
   * It exists so that when one is built, the policy is a function call rather
   * than a schema migration against live conversation data.
   */
  static async tombstoneParticipant(
    participantId: string,
    displayName = "Deleted user",
  ): Promise<number> {
    const Conversation = await getConversationModel();

    const result = await Conversation.updateMany(
      { "participants.id": new mongoose.Types.ObjectId(participantId) },
      {
        $set: {
          "participants.$[target].snapshot.name": displayName,
          "participants.$[target].snapshot.initials": "?",
        },
        $unset: {
          "participants.$[target].snapshot.institution": "",
        },
      },
      {
        arrayFilters: [
          { "target.id": new mongoose.Types.ObjectId(participantId) },
        ],
      },
    );

    return result.modifiedCount;
  }

  /**
   * The participant entry for one identity, or undefined if they are not in
   * the conversation. The basis of every access check in the service layer.
   */
  static participantOf(
    conversation: IConversation,
    participantId: string,
  ): IConversationParticipant | undefined {
    return conversation.participants.find(
      (p) => p.id.toString() === participantId,
    );
  }

  /** The other side of a two-party conversation. */
  static counterpartOf(
    conversation: IConversation,
    participantId: string,
  ): IConversationParticipant | undefined {
    return conversation.participants.find(
      (p) => p.id.toString() !== participantId,
    );
  }
}

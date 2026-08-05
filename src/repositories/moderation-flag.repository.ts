import mongoose from "mongoose";

import {
  getModerationFlagModel,
  type IModerationFlag,
  type IModerationFlagEntry,
} from "@/lib/db/models/moderation-flag.model";
import { ModerationReviewStatusEnum } from "@/enums";

export class ModerationFlagRepository {
  /**
   * Records a flag against a conversation.
   *
   * Upserts by `conversationId` and pushes the entry, so a repeat offender is
   * one queue item with a history rather than a wall of near-identical rows.
   *
   * A conversation already marked reviewed or dismissed is **reopened** by a
   * new flag: a moderator's earlier "this is fine" was a judgement about what
   * had happened then, not a permanent exemption.
   */
  static async flag(
    conversationId: string,
    entry: Omit<IModerationFlagEntry, "createdAt">,
  ): Promise<void> {
    const Flag = await getModerationFlagModel();
    const now = new Date();

    await Flag.updateOne(
      { conversationId: new mongoose.Types.ObjectId(conversationId) },
      {
        $push: { entries: { ...entry, createdAt: now } },
        $set: {
          status: ModerationReviewStatusEnum.Pending,
          lastFlaggedAt: now,
        },
        $setOnInsert: {
          conversationId: new mongoose.Types.ObjectId(conversationId),
        },
      },
      { upsert: true },
    );
  }

  /** The moderation queue, newest offence first. */
  static async list({
    status,
    limit = 50,
    cursor,
  }: {
    status?: ModerationReviewStatusEnum;
    limit?: number;
    cursor?: string;
  }): Promise<IModerationFlag[]> {
    const Flag = await getModerationFlagModel();

    const query: mongoose.FilterQuery<IModerationFlag> = {};
    if (status) query.status = status;
    if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };

    return Flag.find(query)
      .sort({ lastFlaggedAt: -1 })
      .limit(limit)
      .lean<IModerationFlag[]>();
  }

  static async findByConversation(
    conversationId: string,
  ): Promise<IModerationFlag | null> {
    const Flag = await getModerationFlagModel();

    return Flag.findOne({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    }).lean<IModerationFlag>();
  }

  static async countPending(): Promise<number> {
    const Flag = await getModerationFlagModel();

    return Flag.countDocuments({
      status: ModerationReviewStatusEnum.Pending,
    });
  }

  static async resolve({
    conversationId,
    status,
    adminId,
    adminName,
    reviewNote,
  }: {
    conversationId: string;
    status: ModerationReviewStatusEnum;
    adminId: string;
    adminName: string;
    reviewNote?: string;
  }): Promise<void> {
    const Flag = await getModerationFlagModel();

    await Flag.updateOne(
      { conversationId: new mongoose.Types.ObjectId(conversationId) },
      {
        $set: {
          status,
          reviewedBy: {
            adminId: new mongoose.Types.ObjectId(adminId),
            adminName,
          },
          reviewedAt: new Date(),
          ...(reviewNote !== undefined ? { reviewNote } : {}),
        },
      },
    );
  }
}

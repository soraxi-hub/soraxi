import { z } from "zod";

import { AdminGuard } from "@/domain/admin/admin-guard";
import { ConversationProjector } from "@/domain/messaging/conversation-projector";
import {
  ConversationStatusEnum,
  ModerationReviewStatusEnum,
} from "@/enums";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { formatOrderNumber } from "@/lib/utils/order-number";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  logAdminAction,
} from "@/modules/admin/security/audit-logger";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { ConversationRepository } from "@/repositories/conversation.repository";
import { MessageRepository } from "@/repositories/message.repository";
import { ModerationFlagRepository } from "@/repositories/moderation-flag.repository";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

/**
 * Message moderation for admins.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ACCESS POLICY, STATED ONCE
 * ─────────────────────────────────────────────────────────────────────────────
 * Admins can read a conversation **only when it has been flagged** — by a user
 * report or by contact detection. There is no procedure here that opens an
 * arbitrary thread, and that is deliberate: the queue is the gate, so the
 * capability to browse private messages simply does not exist in the API.
 *
 * Every read is written to the audit log. Participants are **not** notified,
 * which makes that log the only thing standing behind this promise — treat it
 * as a compliance record, not debug output.
 *
 * Reads are read-only. Nothing here can edit or delete a message: threads are
 * dispute evidence, and an admin-editable transcript is worth nothing in an
 * adjudication.
 */
export const adminModerationRouter = createTRPCRouter({
  /** The queue. Flag metadata only — no message bodies. */
  listQueue: baseProcedure
    .input(
      z.object({
        status: z.nativeEnum(ModerationReviewStatusEnum).optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      try {
        AdminGuard.from(ctx.admin).require(
          PERMISSIONS.VIEW_MODERATION_QUEUE,
        );

        const flags = await ModerationFlagRepository.list({
          status: input.status,
          cursor: input.cursor,
          limit: input.limit ?? 50,
        });

        // Enrich with just enough conversation context to triage without
        // opening anything — who is involved and what it is about, never what
        // was said.
        const items = await Promise.all(
          flags.map(async (flag) => {
            const conversation = await ConversationRepository.findById(
              flag.conversationId.toString(),
            );

            return {
              conversationId: flag.conversationId.toString(),
              status: flag.status,
              lastFlaggedAt: flag.lastFlaggedAt.toISOString(),
              entryCount: flag.entries.length,
              reasons: [...new Set(flag.entries.map((e) => e.reason))],
              signals: [
                ...new Set(flag.entries.flatMap((e) => e.signals ?? [])),
              ],
              participants:
                conversation?.participants.map((p) => ({
                  kind: p.kind,
                  id: p.id.toString(),
                  name: p.snapshot.name,
                })) ?? [],
              scopeKind: conversation?.scope.kind ?? null,
              contextLabel: conversation?.scope.product
                ? conversation.scope.product.name
                : conversation?.scope.order
                  ? formatOrderNumber(
                      conversation.scope.order.subOrderId.toString(),
                      conversation.scope.order.placedAt,
                    )
                  : null,
              conversationStatus: conversation?.status ?? null,
            };
          }),
        );

        return { items, pendingCount: await ModerationFlagRepository.countPending() };
      } catch (error) {
        throw handleTRPCError(error, "Could not load the moderation queue");
      }
    }),

  /**
   * The full conversation for a flagged thread.
   *
   * Full history rather than a window around the reported message: context is
   * usually what distinguishes harassment from a misunderstanding, and a
   * moderator judging on a three-message excerpt will judge badly.
   */
  readThread: baseProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const admin = AdminGuard.from(ctx.admin).require(
          PERMISSIONS.READ_REPORTED_THREAD,
        );

        // The gate: no flag, no access. This is what keeps "we only read
        // reported threads" true at the API level rather than by convention.
        const flag = await ModerationFlagRepository.findByConversation(
          input.conversationId,
        );

        if (!flag) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "This conversation has not been reported and cannot be opened.",
          });
        }

        const conversation = await ConversationRepository.findById(
          input.conversationId,
        );

        if (!conversation) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Conversation not found",
          });
        }

        const messages = await MessageRepository.listByConversation({
          conversationId: input.conversationId,
          limit: 200,
        });

        // Accountability record. Awaited, not fire-and-forget: if the log
        // cannot be written, the read should fail rather than happen
        // unrecorded.
        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: AUDIT_ACTIONS.CONVERSATION_READ,
          module: AUDIT_MODULES.MODERATION,
          resourceId: input.conversationId,
          resourceType: "conversation",
          details: {
            reasons: [...new Set(flag.entries.map((e) => e.reason))],
          },
        });

        const [first, second] = conversation.participants;

        return {
          conversationId: conversation._id.toString(),
          status: conversation.status,
          lockedReason: conversation.lockedReason,
          scopeKind: conversation.scope.kind,
          product: conversation.scope.product
            ? ConversationProjector.productRef(conversation.scope.product)
            : undefined,
          order: conversation.scope.order
            ? ConversationProjector.orderRef(conversation.scope.order)
            : undefined,
          participants: conversation.participants.map((p) => ({
            kind: p.kind,
            id: p.id.toString(),
            name: p.snapshot.name,
            initials: p.snapshot.initials,
          })),
          flag: {
            status: flag.status,
            reviewNote: flag.reviewNote,
            entries: flag.entries.map((e) => ({
              reason: e.reason,
              reportReason: e.reportReason,
              note: e.note,
              signals: e.signals ?? [],
              messageId: e.messageId?.toString(),
              reportedByKind: e.reportedBy?.kind,
              createdAt: e.createdAt.toISOString(),
            })),
          },
          // Oldest-first, and attributed by side rather than "isOwn" — the
          // admin is not a participant and neither party's messages are theirs.
          messages: messages
            .slice()
            .reverse()
            .map((m) => ({
              messageId: m._id.toString(),
              body: m.body,
              senderKind: m.sender.kind,
              senderId: m.sender.id.toString(),
              senderName:
                m.sender.id.toString() === first?.id.toString()
                  ? first?.snapshot.name
                  : m.sender.id.toString() === second?.id.toString()
                    ? second?.snapshot.name
                    : "Soraxi",
              systemType: m.systemType,
              createdAt: m.createdAt.toISOString(),
            })),
        };
      } catch (error) {
        throw handleTRPCError(error, "Could not open this conversation");
      }
    }),

  /** Locks or unlocks a single conversation. */
  setConversationLock: baseProcedure
    .input(
      z.object({
        conversationId: z.string(),
        locked: z.boolean(),
        reason: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const admin = AdminGuard.from(ctx.admin).require(
          PERMISSIONS.MODERATE_CONVERSATIONS,
        );

        await ConversationRepository.setStatus(
          input.conversationId,
          input.locked
            ? ConversationStatusEnum.Locked
            : ConversationStatusEnum.Open,
          input.locked
            ? (input.reason ??
              "This conversation is locked while we review it.")
            : "",
        );

        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: input.locked
            ? AUDIT_ACTIONS.CONVERSATION_LOCKED
            : AUDIT_ACTIONS.CONVERSATION_UNLOCKED,
          module: AUDIT_MODULES.MODERATION,
          resourceId: input.conversationId,
          resourceType: "conversation",
          details: { reason: input.reason },
        });

        return { success: true };
      } catch (error) {
        throw handleTRPCError(error, "Could not update this conversation");
      }
    }),

  /** Marks a flag reviewed or dismissed. */
  resolveFlag: baseProcedure
    .input(
      z.object({
        conversationId: z.string(),
        status: z.enum([
          ModerationReviewStatusEnum.Reviewed,
          ModerationReviewStatusEnum.Dismissed,
        ]),
        reviewNote: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const admin = AdminGuard.from(ctx.admin).require(
          PERMISSIONS.MODERATE_CONVERSATIONS,
        );

        await ModerationFlagRepository.resolve({
          conversationId: input.conversationId,
          status: input.status,
          adminId: admin.id,
          adminName: admin.name,
          reviewNote: input.reviewNote,
        });

        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles,
          action: AUDIT_ACTIONS.MODERATION_FLAG_RESOLVED,
          module: AUDIT_MODULES.MODERATION,
          resourceId: input.conversationId,
          resourceType: "conversation",
          details: { status: input.status, note: input.reviewNote },
        });

        return { success: true };
      } catch (error) {
        throw handleTRPCError(error, "Could not resolve this flag");
      }
    }),
});

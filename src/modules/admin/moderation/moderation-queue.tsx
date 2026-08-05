"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Flag, Lock, LockOpen, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ModerationFlagReasonEnum, ModerationReviewStatusEnum } from "@/enums";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

const STATUS_TABS: { id: ModerationReviewStatusEnum; label: string }[] = [
  { id: ModerationReviewStatusEnum.Pending, label: "Pending" },
  { id: ModerationReviewStatusEnum.Reviewed, label: "Reviewed" },
  { id: ModerationReviewStatusEnum.Dismissed, label: "Dismissed" },
];

const SIGNAL_LABELS: Record<string, string> = {
  phone_number: "Phone number",
  spelled_digits: "Spelled-out digits",
  email: "Email address",
  off_platform_channel: "Off-platform channel",
  off_platform_payment: "Off-platform payment",
};

/**
 * Moderation queue and thread reader.
 *
 * Two panes: flagged conversations on the left, the selected conversation on
 * the right. The right pane is **not** loaded until a moderator explicitly
 * opens a row — reading two people's private messages is an action, and it
 * writes an audit entry every time, so it must never happen as a side effect
 * of the list rendering.
 */
export function ModerationQueue() {
  const [status, setStatus] = useState<ModerationReviewStatusEnum>(
    ModerationReviewStatusEnum.Pending,
  );
  const [openId, setOpenId] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const queue = useQuery(
    trpc.adminModeration.listQueue.queryOptions({ status }),
  );

  const thread = useQuery({
    ...trpc.adminModeration.readThread.queryOptions({
      conversationId: openId ?? "",
    }),
    enabled: Boolean(openId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.adminModeration.listQueue.queryKey(),
    });
    if (openId) {
      queryClient.invalidateQueries({
        queryKey: trpc.adminModeration.readThread.queryKey({
          conversationId: openId,
        }),
      });
    }
  };

  const setLock = useMutation({
    ...trpc.adminModeration.setConversationLock.mutationOptions(),
    onSuccess: () => {
      toast.success("Conversation updated");
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const resolve = useMutation({
    ...trpc.adminModeration.resolveFlag.mutationOptions(),
    onSuccess: () => {
      toast.success("Flag resolved");
      setOpenId(null);
      invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const [note, setNote] = useState("");
  const items = queue.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Message moderation</h1>
          <p className="text-sm text-muted-foreground">
            Conversations flagged by a report or by automatic detection.
          </p>
        </div>
        {(queue.data?.pendingCount ?? 0) > 0 && (
          <Badge className="gap-1 bg-soraxi-error text-white">
            <ShieldAlert className="size-3" />
            {queue.data?.pendingCount} pending
          </Badge>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 sm:w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setStatus(tab.id);
              setOpenId(null);
            }}
            className={cn(
              "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none",
              status === tab.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        {/* Queue */}
        <Card>
          <CardContent className="p-0">
            {queue.isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Nothing here. That&apos;s good news.
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.conversationId}
                  onClick={() => setOpenId(item.conversationId)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 border-b border-border p-3 text-left transition-colors last:border-b-0",
                    openId === item.conversationId
                      ? "bg-muted/60"
                      : "hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.participants.map((p) => p.name).join(" ↔ ") ||
                        "Conversation"}
                    </span>
                    {item.conversationStatus === "locked" && (
                      <Lock className="size-3.5 shrink-0 text-soraxi-error" />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {item.reasons.map((reason) => (
                      <Badge
                        key={reason}
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          reason === ModerationFlagReasonEnum.ContactDetails
                            ? "border-soraxi-warning/50 text-yellow-700 dark:text-soraxi-warning"
                            : "border-soraxi-error/40 text-soraxi-error",
                        )}
                      >
                        {reason === ModerationFlagReasonEnum.ContactDetails ? (
                          <AlertTriangle className="mr-1 size-2.5" />
                        ) : (
                          <Flag className="mr-1 size-2.5" />
                        )}
                        {reason === ModerationFlagReasonEnum.ContactDetails
                          ? "Auto-detected"
                          : "Reported"}
                      </Badge>
                    ))}
                    {item.entryCount > 1 && (
                      <Badge variant="secondary" className="text-[10px]">
                        ×{item.entryCount}
                      </Badge>
                    )}
                  </div>

                  {item.contextLabel && (
                    <span className="truncate text-xs text-muted-foreground">
                      {item.contextLabel}
                    </span>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Thread reader */}
        <Card className="min-h-[24rem]">
          <CardContent className="p-4">
            {!openId ? (
              <div className="flex h-full min-h-[20rem] items-center justify-center">
                <div className="max-w-sm text-center">
                  <p className="font-medium">Select a flagged conversation</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Opening a conversation records an entry in the audit log.
                    Participants are not notified.
                  </p>
                </div>
              </div>
            ) : thread.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : thread.isError ? (
              <p className="p-6 text-center text-sm text-soraxi-error">
                {thread.error.message}
              </p>
            ) : thread.data ? (
              <div className="space-y-4">
                {/* Why it was flagged */}
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    Flag history
                  </p>
                  <ul className="space-y-1.5 text-sm">
                    {thread.data.flag.entries.map((entry, i) => (
                      <li key={i} className="flex flex-wrap gap-x-2">
                        <span className="font-medium">
                          {entry.reason ===
                          ModerationFlagReasonEnum.ContactDetails
                            ? "Auto-detected"
                            : `Reported by ${entry.reportedByKind ?? "user"}`}
                        </span>
                        <span className="text-muted-foreground">
                          {entry.signals.length > 0
                            ? entry.signals
                                .map((s) => SIGNAL_LABELS[s] ?? s)
                                .join(", ")
                            : (entry.reportReason ?? "")}
                        </span>
                        {entry.note && (
                          <span className="w-full text-muted-foreground italic">
                            “{entry.note}”
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Transcript */}
                <div className="max-h-[26rem] space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                  {thread.data.messages.map((message) => (
                    <div key={message.messageId} className="text-sm">
                      {message.systemType ? (
                        <p className="py-1 text-center text-xs text-muted-foreground">
                          {message.body}
                        </p>
                      ) : (
                        <p>
                          <span className="font-semibold">
                            {message.senderName}:
                          </span>{" "}
                          <span className="break-words">{message.body}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Review note (optional)"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setLock.mutate({
                          conversationId: openId,
                          locked: thread.data?.status !== "locked",
                        })
                      }
                      disabled={setLock.isPending}
                      className="gap-2"
                    >
                      {thread.data.status === "locked" ? (
                        <>
                          <LockOpen className="size-4" /> Unlock
                        </>
                      ) : (
                        <>
                          <Lock className="size-4" /> Lock thread
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        resolve.mutate({
                          conversationId: openId,
                          status: ModerationReviewStatusEnum.Dismissed,
                          reviewNote: note.trim() || undefined,
                        })
                      }
                      disabled={resolve.isPending}
                    >
                      Dismiss
                    </Button>

                    <Button
                      onClick={() =>
                        resolve.mutate({
                          conversationId: openId,
                          status: ModerationReviewStatusEnum.Reviewed,
                          reviewNote: note.trim() || undefined,
                        })
                      }
                      disabled={resolve.isPending}
                      className="bg-soraxi-green text-white hover:bg-soraxi-green-hover"
                    >
                      Mark reviewed
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

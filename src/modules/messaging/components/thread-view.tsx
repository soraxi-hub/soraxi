"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MessageParticipantKindEnum } from "@/enums";
import type { ConversationThreadView } from "@/domain/messaging/messaging-types";

import { formatDayDivider, isNewDay } from "../messaging-format";
import type { MessagingRole } from "../messaging-client";
import { quickRepliesFor } from "../quick-replies";
import { Composer, LockedNotice } from "./composer";
import { DayDivider, MessageBubble } from "./message-bubble";
import { ReferenceCard } from "./reference-cards";
import { ReportDialog } from "./report-dialog";

interface ThreadViewProps {
  thread: ConversationThreadView | undefined;
  role: MessagingRole;
  isLoading: boolean;
  isSending: boolean;
  onSend: (body: string) => void;
  /** Mobile only — returns to the inbox list. */
  onBack: () => void;
}

/**
 * Header: who you're talking to, and a way to look them up.
 *
 * The counterpart's link differs by role because the destinations are genuinely
 * different pages — a vendor looks at a customer, a customer looks at a store.
 */
function ThreadHeader({
  thread,
  role,
  onBack,
}: {
  thread: ConversationThreadView;
  role: MessagingRole;
  onBack: () => void;
}) {
  const { counterpart } = thread;
  const isStore = counterpart.kind === MessageParticipantKindEnum.Store;

  return (
    <div className="flex items-center gap-3 border-b border-border py-3 px-0 sm:p-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        aria-label="Back to messages"
        className="size-4 shrink-0 lg:hidden"
      >
        <ArrowLeft className="size-4" />
      </Button>

      <div className="relative shrink-0">
        <Avatar className="size-10">
          <AvatarFallback className="bg-soraxi-green text-sm font-semibold text-white">
            {counterpart.initials}
          </AvatarFallback>
        </Avatar>
        {counterpart.isOnline && (
          <span
            className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-background bg-soraxi-success"
            aria-label="Online"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-semibold">{counterpart.name}</p>
          {counterpart.isVerified && (
            <BadgeCheck
              className="size-4 shrink-0 text-soraxi-green"
              aria-label="Verified vendor"
            />
          )}
        </div>
        {counterpart.institution && (
          <p className="truncate text-xs text-muted-foreground">
            {counterpart.institution}
          </p>
        )}
      </div>

      {isStore && (
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link href={`/brand/${counterpart.id}`}>View store</Link>
        </Button>
      )}

      <ReportDialog conversationId={thread.conversationId} role={role} />
    </div>
  );
}

/** The pinned reminder of what this thread is about. */
function ThreadAboutBar({ thread }: { thread: ConversationThreadView }) {
  if (!thread.product && !thread.order) return null;

  return (
    <div className="flex items-start gap-3 border-b border-border py-3 px-0 sm:p-4">
      <span className="mt-3 hidden shrink-0 text-xs text-muted-foreground sm:block">
        About
      </span>
      <div className="min-w-0 flex-1">
        <ReferenceCard product={thread.product} order={thread.order} />
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-56 rounded-2xl" />
        <Skeleton className="h-10 w-40 rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * A whole conversation: header, pinned context, history, composer.
 *
 * Fills its container and scrolls only the message list, so the header and
 * composer stay put — on a phone especially, a composer that scrolls away is
 * the difference between usable and not.
 */
export function ThreadView({
  thread,
  role,
  isLoading,
  isSending,
  onSend,
  onBack,
}: ThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageId = thread?.messages.at(-1)?.messageId;

  // Pin to the newest message whenever one arrives — including the first
  // render of a thread, which should open at the bottom like every chat app.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, [lastMessageId, thread?.conversationId]);

  if (isLoading || !thread) return <ThreadSkeleton />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ThreadHeader thread={thread} role={role} onBack={onBack} />
      <ThreadAboutBar thread={thread} />

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto py-2"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {thread.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6">
            <p className="text-center text-sm text-muted-foreground">
              No messages yet — say hello.
            </p>
          </div>
        ) : (
          thread.messages.map((message, index) => {
            const previous = thread.messages[index - 1];

            return (
              <div key={message.messageId}>
                {isNewDay(previous?.createdAt, message.createdAt) && (
                  <DayDivider label={formatDayDivider(message.createdAt)} />
                )}
                <MessageBubble message={message} />
              </div>
            );
          })
        )}
      </div>

      {thread.canSend ? (
        <Composer
          placeholder={`Reply to ${firstName(thread.counterpart.name)}...`}
          quickReplies={quickRepliesFor(role, thread.scopeKind)}
          isSending={isSending}
          onSend={onSend}
        />
      ) : (
        <LockedNotice
          reason={
            thread.lockedReason ?? "You can't send new messages in this thread."
          }
        />
      )}
    </div>
  );
}

/** "Ada Nwosu" → "Ada". Store names are left whole. */
function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

/** Shown in the right-hand pane on desktop when nothing is selected. */
export function NoThreadSelected() {
  return (
    <div className={cn("flex h-full items-center justify-center p-8")}>
      <div className="text-center">
        <p className="font-medium">Select a conversation</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a message from the list to read it here.
        </p>
      </div>
    </div>
  );
}

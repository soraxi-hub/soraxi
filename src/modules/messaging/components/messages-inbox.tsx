"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MessageScopeKindEnum } from "@/enums";
import type { ConversationInboxView } from "@/domain/messaging/messaging-types";

import { formatInboxTime } from "../messaging-format";
import type { InboxFilters, MessagingRole } from "../messaging-client";

type FilterTab = "all" | "unread" | "products" | "orders";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
];

/** Translates a tab into the filters the server understands. */
export function filtersForTab(tab: FilterTab): InboxFilters {
  switch (tab) {
    case "unread":
      return { unreadOnly: true };
    case "products":
      return { scopeKind: MessageScopeKindEnum.Product };
    case "orders":
      return { scopeKind: MessageScopeKindEnum.Order };
    default:
      return {};
  }
}

/**
 * One row in the inbox.
 *
 * The unread state is carried by weight rather than colour alone, so it
 * survives both themes and colour-blind viewers without needing the badge to
 * be read.
 */
function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: {
  conversation: ConversationInboxView;
  isActive: boolean;
  onSelect: () => void;
}) {
  const isUnread = conversation.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-3 border-l-2 px-3 py-3 text-left transition-colors sm:px-4",
        isActive
          ? "border-l-soraxi-green bg-muted/60"
          : "border-l-transparent hover:bg-muted/40",
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10">
          <AvatarFallback className="bg-soraxi-green text-xs font-semibold text-white">
            {conversation.counterpart.initials}
          </AvatarFallback>
        </Avatar>
        {conversation.counterpart.isOnline && (
          <span
            className="absolute right-0 bottom-0 size-3 rounded-full border-2 border-background bg-soraxi-success"
            aria-label="Online"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold">
            {conversation.counterpart.name}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatInboxTime(conversation.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "line-clamp-1 text-sm",
              isUnread
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {conversation.lastMessagePreview || "No messages yet"}
          </p>
          {isUnread && (
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full bg-soraxi-green text-[11px] font-semibold text-white"
              aria-label={`${conversation.unreadCount} unread`}
            >
              {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
            </span>
          )}
        </div>

        {conversation.contextLabel && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <ContextThumbnail conversation={conversation} />
            <span className="truncate text-xs text-muted-foreground">
              {conversation.contextLabel}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

function ContextThumbnail({
  conversation,
}: {
  conversation: ConversationInboxView;
}) {
  const src = conversation.product?.image ?? conversation.order?.thumbnails[0];

  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted"
      aria-hidden
    >
      {src ? (
        // Intentionally a plain <img>: this is a 16px decorative chip, and
        // next/image's wrapper and srcset machinery cost more than they save.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-2.5 text-muted-foreground/60" />
      )}
    </span>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-1 p-3 sm:p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface MessagesInboxProps {
  role: MessagingRole;
  conversations: ConversationInboxView[];
  unreadTotal: number;
  isLoading: boolean;
  activeConversationId: string | null;
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  onSelect: (conversationId: string) => void;
}

/**
 * The inbox: header, search, filter tabs and the conversation list.
 *
 * Search is client-side over the loaded page — it matches the counterpart's
 * name and the context label, which together cover "find that student" and
 * "find that order". A server-side search would be a different feature, and
 * this one is instant.
 */
export function MessagesInbox({
  role,
  conversations,
  unreadTotal,
  isLoading,
  activeConversationId,
  activeTab,
  onTabChange,
  onSelect,
}: MessagesInboxProps) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter(
      (c) =>
        c.counterpart.name.toLowerCase().includes(query) ||
        c.contextLabel.toLowerCase().includes(query),
    );
  }, [conversations, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-border p-0 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">Messages</h1>
          {unreadTotal > 0 && (
            <span className="rounded-full bg-soraxi-green px-2.5 py-1 text-xs font-semibold text-white">
              {unreadTotal} new
            </span>
          )}
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={
              role === "vendor"
                ? "Search customers or orders..."
                : "Search stores or orders..."
            }
            aria-label="Search conversations"
            className="pl-9"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter conversations"
          className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <InboxSkeleton />
        ) : visible.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-center text-sm text-muted-foreground">
              {search.trim()
                ? `Nothing matches "${search.trim()}".`
                : activeTab === "unread"
                  ? "No unread messages."
                  : "No conversations yet."}
            </p>
          </div>
        ) : (
          visible.map((conversation) => (
            <ConversationItem
              key={conversation.conversationId}
              conversation={conversation}
              isActive={conversation.conversationId === activeConversationId}
              onSelect={() => onSelect(conversation.conversationId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export type { FilterTab };

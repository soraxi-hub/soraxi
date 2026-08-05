"use client";

import { useEffect } from "react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import {
  useInbox,
  useMarkRead,
  useSendMessage,
  useThread,
  useUnreadTotal,
  type MessagingRole,
} from "./messaging-client";
import {
  filtersForTab,
  MessagesInbox,
  type FilterTab,
} from "./components/messages-inbox";
import { NoThreadSelected, ThreadView } from "./components/thread-view";

interface MessagingPageProps {
  role: MessagingRole;
}

/**
 * The messaging screen, shared by both sides of the marketplace.
 *
 * **Layout.** Two panes from `lg` up; a single pane below it. On a phone the
 * inbox and the thread are separate screens — the selected conversation lives
 * in the URL, so the browser's back gesture moves between them without any
 * bespoke history handling, and a thread can be linked to directly.
 *
 * **Delivery.** Everything arrives by polling (see `messaging-client.ts`). This
 * component contains no knowledge of that: it consumes hooks, and the day the
 * transport becomes a websocket, nothing here changes.
 */
export function MessagingPage({ role }: MessagingPageProps) {
  const [conversationId, setConversationId] = useQueryState("c");
  const [tab, setTab] = useQueryState("tab", { defaultValue: "all" });

  const activeTab = tab as FilterTab;

  const inbox = useInbox(role, filtersForTab(activeTab));
  const thread = useThread(role, conversationId);
  const unread = useUnreadTotal(role);

  const markRead = useMarkRead(role);
  const sendMessage = useSendMessage(role, conversationId ?? "");

  // Clearing unread is a side effect of opening a thread, not of rendering it —
  // keyed on the id so re-polls don't fire it repeatedly.
  useEffect(() => {
    if (!conversationId) return;
    markRead.mutate({ conversationId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = (body: string) => {
    if (!conversationId) return;

    sendMessage.mutate(
      { conversationId, body },
      {
        onError: (error) => {
          // Rate limits and locked threads both surface here, and both are
          // things the sender needs told rather than left guessing about.
          toast.error(error.message || "Could not send your message");
        },
      },
    );
  };

  const conversations = inbox.data?.conversations ?? [];

  return (
    <div className="h-[calc(100vh-8rem)] min-h-0 lg:h-[calc(100vh-6rem)]">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Inbox — hidden on mobile once a thread is open */}
        <div
          className={cn(
            "min-h-0 overflow-hidden md:rounded-xl md:border md:border-border bg-transparent",
            conversationId ? "hidden lg:block" : "block",
          )}
        >
          <MessagesInbox
            role={role}
            conversations={conversations}
            unreadTotal={unread.data?.total ?? 0}
            isLoading={inbox.isLoading}
            activeConversationId={conversationId}
            activeTab={activeTab}
            onTabChange={(next) => setTab(next === "all" ? null : next)}
            onSelect={(id) => setConversationId(id)}
          />
        </div>

        {/* Thread — hidden on mobile until one is chosen */}
        <div
          className={cn(
            "min-h-0 overflow-hidden md:rounded-xl md:border md:border-border bg-transparent",
            conversationId ? "block" : "hidden lg:block",
          )}
        >
          {conversationId ? (
            <ThreadView
              thread={thread.data}
              role={role}
              isLoading={thread.isLoading}
              isSending={sendMessage.isPending}
              onSend={handleSend}
              onBack={() => setConversationId(null)}
            />
          ) : (
            <NoThreadSelected />
          )}
        </div>
      </div>
    </div>
  );
}

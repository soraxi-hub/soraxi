"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import type { MessageScopeKindEnum } from "@/enums";

/**
 * Which side of the marketplace the current view belongs to.
 *
 * Customers and vendors call different routers with identical shapes; the
 * components are shared and take this as a prop.
 */
export type MessagingRole = "customer" | "vendor";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TRANSPORT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Message delivery is polling, deliberately. The app runs on Vercel serverless,
 * where nothing can hold a WebSocket open, and vendor replies on a campus
 * marketplace arrive in minutes rather than milliseconds.
 *
 * The UI never sees this decision: components consume the hooks below and know
 * nothing about how messages arrive. Swapping to Pusher or SSE later means
 * changing these intervals to subscriptions in this file alone.
 *
 * Two rates, because the two reads have very different urgency — and both stop
 * entirely when the tab is hidden, so a backgrounded tab costs nothing.
 */
const THREAD_POLL_MS = 4_000;
const INBOX_POLL_MS = 15_000;
const BADGE_POLL_MS = 60_000;

/**
 * Picks the router for the current role.
 *
 * Both routers expose the same procedures with the same signatures, so callers
 * are role-agnostic past this point.
 */
function useMessagingApi(role: MessagingRole) {
  const trpc = useTRPC();
  return role === "vendor" ? trpc.vendorMessaging : trpc.customerMessaging;
}

export interface InboxFilters {
  scopeKind?: MessageScopeKindEnum;
  unreadOnly?: boolean;
}

/** The inbox list, refreshed on a slow poll. */
export function useInbox(role: MessagingRole, filters: InboxFilters) {
  const api = useMessagingApi(role);

  return useQuery({
    ...api.listInbox.queryOptions({
      scopeKind: filters.scopeKind,
      unreadOnly: filters.unreadOnly,
    }),
    refetchInterval: INBOX_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** An open thread, refreshed on a fast poll. */
export function useThread(
  role: MessagingRole,
  conversationId: string | null,
) {
  const api = useMessagingApi(role);

  return useQuery({
    ...api.getThread.queryOptions({ conversationId: conversationId ?? "" }),
    enabled: Boolean(conversationId),
    refetchInterval: THREAD_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/** Total unread across all threads — the "N new" pill. */
export function useUnreadTotal(role: MessagingRole) {
  const api = useMessagingApi(role);

  return useQuery({
    ...api.totalUnread.queryOptions(),
    refetchInterval: BADGE_POLL_MS,
    refetchIntervalInBackground: false,
  });
}

/**
 * Sends a message and refreshes the thread and inbox.
 *
 * No optimistic insert: the server assigns the id and timestamp, and the poll
 * is fast enough that a pending state reads as responsive without risking a
 * bubble that appears, then vanishes when the write turns out to have failed.
 */
export function useSendMessage(role: MessagingRole, conversationId: string) {
  const api = useMessagingApi(role);
  const queryClient = useQueryClient();

  return useMutation({
    ...api.sendMessage.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: api.getThread.queryKey({ conversationId }),
      });
      queryClient.invalidateQueries({ queryKey: api.listInbox.queryKey() });
      queryClient.invalidateQueries({ queryKey: api.totalUnread.queryKey() });
    },
  });
}

/**
 * Clears a thread's unread state.
 *
 * Fired when a thread is opened. Failures are swallowed: an unread badge that
 * lingers a few seconds is not worth interrupting someone mid-conversation
 * with an error toast.
 */
export function useMarkRead(role: MessagingRole) {
  const api = useMessagingApi(role);
  const queryClient = useQueryClient();

  return useMutation({
    ...api.markRead.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: api.listInbox.queryKey() });
      queryClient.invalidateQueries({ queryKey: api.totalUnread.queryKey() });
    },
    onError: () => {
      // Intentionally silent — see above.
    },
  });
}

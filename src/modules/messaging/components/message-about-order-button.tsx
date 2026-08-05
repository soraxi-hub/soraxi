"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import type { MessagingRole } from "../messaging-client";

interface MessageAboutOrderButtonProps {
  subOrderId: string;
  /** Which side is asking — decides the router and where we navigate. */
  role: MessagingRole;
  /** Required for the vendor route; ignored for customers. */
  storeId?: string;
  label?: string;
  className?: string;
}

function ActionButton({
  isPending,
  label,
  className,
  onClick,
}: {
  isPending: boolean;
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={isPending}
      className={cn("w-full gap-2", className)}
    >
      {isPending ? (
        <Spinner className="size-4" />
      ) : (
        <MessageSquare className="size-4" />
      )}
      {label}
    </Button>
  );
}

/**
 * The two roles are separate components rather than one with a ternary.
 *
 * The procedures have identical signatures, but selecting between them at
 * runtime produces a union that defeats tRPC's error-type inference — and
 * hand-annotating the callbacks to work around it throws away exactly the
 * type safety that makes these calls worth checking.
 */
function CustomerButton({
  subOrderId,
  label,
  className,
}: {
  subOrderId: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();

  const openThread = useMutation(
    trpc.customerMessaging.openOrderThread.mutationOptions({
      onSuccess: ({ conversationId }) => {
        router.push(`/messages?c=${conversationId}`);
      },
      onError: (error) => {
        toast.error(error.message || "Could not start this conversation");
      },
    }),
  );

  return (
    <ActionButton
      isPending={openThread.isPending}
      label={label}
      className={className}
      onClick={() => openThread.mutate({ subOrderId })}
    />
  );
}

function VendorButton({
  subOrderId,
  storeId,
  label,
  className,
}: {
  subOrderId: string;
  storeId: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const trpc = useTRPC();

  const openThread = useMutation(
    trpc.vendorMessaging.openOrderThread.mutationOptions({
      onSuccess: ({ conversationId }) => {
        router.push(`/store/${storeId}/messages?c=${conversationId}`);
      },
      onError: (error) => {
        toast.error(error.message || "Could not start this conversation");
      },
    }),
  );

  return (
    <ActionButton
      isPending={openThread.isPending}
      label={label}
      className={className}
      onClick={() => openThread.mutate({ subOrderId })}
    />
  );
}

/**
 * Opens (or reopens) the thread for a sub-order and navigates to it.
 *
 * Both sides may start an order conversation — unlike product enquiries, where
 * only customers may initiate — because a vendor chasing a delivery detail has
 * a legitimate reason to make contact.
 *
 * Idempotent per sub-order, so this never fragments into parallel threads about
 * the same order.
 */
export function MessageAboutOrderButton({
  subOrderId,
  role,
  storeId,
  label,
  className,
}: MessageAboutOrderButtonProps) {
  if (role === "vendor") {
    // Without a store id there is nowhere to navigate after opening the
    // thread, so the action is not offered at all.
    if (!storeId) return null;

    return (
      <VendorButton
        subOrderId={subOrderId}
        storeId={storeId}
        label={label ?? "Message customer"}
        className={className}
      />
    );
  }

  return (
    <CustomerButton
      subOrderId={subOrderId}
      label={label ?? "Message vendor"}
      className={className}
    />
  );
}

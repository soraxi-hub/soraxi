"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

interface MessageVendorButtonProps {
  /** The product being enquired about — snapshotted into the new thread. */
  productId: string;
  label?: string;
  variant?: "default" | "outline";
  className?: string;
}

/**
 * Opens a product enquiry and navigates to it.
 *
 * Thread creation is idempotent per (customer, product), so pressing this twice
 * — or coming back a week later — lands in the same conversation rather than
 * fragmenting it into several.
 *
 * An unauthenticated visitor is sent to sign in with a return path, so the
 * enquiry survives the detour.
 */
export function MessageVendorButton({
  productId,
  label = "Message vendor",
  variant = "outline",
  className,
}: MessageVendorButtonProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const openThread = useMutation({
    ...trpc.customerMessaging.openProductThread.mutationOptions(),
    onSuccess: ({ conversationId }) => {
      router.push(`/messages?c=${conversationId}`);
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        router.push(`/sign-in?callbackUrl=/products`);
        return;
      }

      toast.error(error.message || "Could not start this conversation");
    },
  });

  return (
    <Button
      variant={variant}
      onClick={() => openThread.mutate({ productId })}
      disabled={openThread.isPending}
      className={cn("gap-2", className)}
    >
      {openThread.isPending ? (
        <Spinner className="size-4" />
      ) : (
        <MessageSquare className="size-4" />
      )}
      {label}
    </Button>
  );
}

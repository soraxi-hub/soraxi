"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DeliveryStatus, deliveryStatusLabel } from "@/enums";
import { useTRPC } from "@/trpc/client";

import { VendorCodeDialog } from "./vendor-code-dialog";

interface DeliveryActionsProps {
  orderId: string;
  subOrderId: string;
  status: DeliveryStatus;
  updating: boolean;
  onAdvance: (subOrderId: string, next: DeliveryStatus) => void;
}

/**
 * Delivery actions for a sub-order, ordered by what we want vendors to do.
 *
 * The hierarchy is the whole point:
 *
 *  1. **Confirm delivery with code** — primary, green. Buyer-attested, releases
 *     payment immediately.
 *  2. Routine forward transitions — outline. Ordinary progress.
 *  3. **Mark delivered without a code** — a plain link, behind a confirmation
 *     that states the cost. It stays available because riders lose phones and
 *     customers refuse codes, but it must never look like the quick option.
 *  4. Terminal failures — destructive styling, visually separated.
 *
 * A dropdown treated all of these as equivalent. They are not: one of them
 * decides whether the vendor is paid today or in three days, and whether a
 * dispute is winnable.
 */
export function DeliveryActions({
  orderId,
  subOrderId,
  status,
  updating,
  onAdvance,
}: DeliveryActionsProps) {
  const [confirmingDeclare, setConfirmingDeclare] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const declare = useMutation({
    ...trpc.deliveryProof.declareWithoutProof.mutationOptions(),
    onSuccess: () => {
      toast.success("Marked delivered. Payment stays in escrow for now.");
      setConfirmingDeclare(false);
      queryClient.invalidateQueries({
        queryKey: trpc.storeOrders.getStoreOrderById.queryKey({ orderId }),
      });
    },
    onError: (error) => {
      toast.error(error.message);
      setConfirmingDeclare(false);
    },
  });

  if (status === DeliveryStatus.Delivered) {
    return (
      <p className="text-sm text-muted-foreground">
        This sub-order is complete. No further status changes are possible.
      </p>
    );
  }

  // Terminal failure states — nothing left to do.
  if (
    [
      DeliveryStatus.Canceled,
      DeliveryStatus.Returned,
      DeliveryStatus.FailedDelivery,
      DeliveryStatus.Refunded,
    ].includes(status)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        This sub-order ended as &ldquo;{deliveryStatusLabel(status)}&rdquo;. No
        further status changes are possible.
      </p>
    );
  }

  // Delivery can be confirmed from Shipped onwards — the state machine allows
  // Shipped → Delivered directly, and a code exists from Shipped.
  const canConfirmDelivery =
    status === DeliveryStatus.Shipped ||
    status === DeliveryStatus.OutForDelivery;

  const forwardStep =
    status === DeliveryStatus.OrderPlaced
      ? DeliveryStatus.Processing
      : status === DeliveryStatus.Processing
        ? DeliveryStatus.Shipped
        : status === DeliveryStatus.Shipped
          ? DeliveryStatus.OutForDelivery
          : null;

  const failureStep =
    status === DeliveryStatus.OutForDelivery
      ? DeliveryStatus.FailedDelivery
      : status === DeliveryStatus.Shipped
        ? DeliveryStatus.Returned
        : DeliveryStatus.Canceled;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {forwardStep && (
          <Button
            type="button"
            variant={canConfirmDelivery ? "outline" : "default"}
            disabled={updating}
            onClick={() => onAdvance(subOrderId, forwardStep)}
            className={
              canConfirmDelivery
                ? ""
                : "bg-soraxi-green text-white hover:bg-soraxi-green-hover"
            }
          >
            {updating && <Spinner className="mr-2 size-4" />}
            Mark as {deliveryStatusLabel(forwardStep).toLowerCase()}
          </Button>
        )}

        {canConfirmDelivery && (
          <VendorCodeDialog orderId={orderId} subOrderId={subOrderId}>
            <Button
              type="button"
              disabled={updating}
              className="gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
            >
              <KeyRound className="size-4" />
              Confirm delivery with code
            </Button>
          </VendorCodeDialog>
        )}
      </div>

      {canConfirmDelivery && (
        <>
          <p className="border-t border-dashed border-border pt-3 text-xs text-muted-foreground">
            Entering the customer&apos;s code releases your payment immediately.
            Marking it delivered yourself leaves the money in escrow.
          </p>

          {/* Deliberately a plain link, not a button: available, never
              attractive. */}
          <button
            type="button"
            disabled={updating || declare.isPending}
            onClick={() => setConfirmingDeclare(true)}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          >
            Mark delivered without a code
          </button>
        </>
      )}

      <div className="pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={updating}
          onClick={() => onAdvance(subOrderId, failureStep)}
          className="border-soraxi-error/50 text-soraxi-error hover:bg-soraxi-error/10 hover:text-soraxi-error"
        >
          {deliveryStatusLabel(failureStep)}
        </Button>
      </div>

      <AlertDialog
        open={confirmingDeclare}
        onOpenChange={setConfirmingDeclare}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark delivered without a code?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Your payment stays in escrow for the usual waiting period
                  instead of being released now.
                </p>
                <p>
                  If the customer disputes this delivery, we&apos;ll have no
                  proof it arrived. Ask the delivery person to enter the
                  customer&apos;s code instead if you can.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={declare.isPending}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={declare.isPending}
              onClick={(event) => {
                event.preventDefault();
                declare.mutate({ orderId, subOrderId });
              }}
            >
              {declare.isPending && <Spinner className="mr-2 size-4" />}
              Mark delivered anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

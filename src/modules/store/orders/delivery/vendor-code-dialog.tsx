"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { DELIVERY_CODE_LENGTH } from "@/constants/delivery";
import { useTRPC } from "@/trpc/client";
import { CodeInput } from "@/modules/delivery/components/code-input";

interface VendorCodeDialogProps {
  orderId: string;
  subOrderId: string;
  children: ReactNode;
}

/**
 * Lets a vendor enter a code read to them over the phone.
 *
 * The fallback for a rider with no smartphone or no data. It is still
 * buyer-attested — the customer released the code — so it earns the same
 * immediate payout as the link, and the copy says so plainly. A vendor who
 * believes this path is second-class will reach for "mark delivered without a
 * code" instead, which is the outcome we least want.
 *
 * The rider's name is captured here too, so the record is identical however the
 * code reached us.
 */
export function VendorCodeDialog({
  orderId,
  subOrderId,
  children,
}: VendorCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [riderName, setRiderName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const confirm = useMutation({
    ...trpc.deliveryProof.confirmWithCode.mutationOptions(),
    onSuccess: () => {
      toast.success("Delivery confirmed. Your payment is being released.");
      setOpen(false);
      setCode("");
      setRiderName("");
      setError(null);
      queryClient.invalidateQueries({
        queryKey: trpc.storeOrders.getStoreOrderById.queryKey({ orderId }),
      });
    },
    onError: (mutationError) => {
      setError(mutationError.message);
      setCode("");
    },
  });

  const canSubmit =
    code.length === DELIVERY_CODE_LENGTH &&
    riderName.trim().length >= 2 &&
    !confirm.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter the customer&apos;s code</DialogTitle>
          <DialogDescription>
            For a rider with no smartphone or data — read the code over the
            phone and enter it here. This counts as a code-confirmed delivery,
            so your payment is released immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vendor-rider-name">Who delivered it?</Label>
            <Input
              id="vendor-rider-name"
              value={riderName}
              onChange={(event) => setRiderName(event.target.value)}
              placeholder="Rider's name"
              maxLength={60}
              disabled={confirm.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Delivery code</Label>
            <CodeInput
              value={code}
              onChange={(next) => {
                setCode(next);
                if (error) setError(null);
              }}
              disabled={confirm.isPending}
              hasError={Boolean(error)}
              size="compact"
            />
            {error && (
              <p role="alert" className="text-center text-sm text-soraxi-error">
                {error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={confirm.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              confirm.mutate({
                orderId,
                subOrderId,
                code,
                riderName: riderName.trim(),
              })
            }
            disabled={!canSubmit}
            className="gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
          >
            {confirm.isPending && <Spinner className="size-4" />}
            Confirm delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

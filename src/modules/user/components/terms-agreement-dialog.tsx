"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

interface TermsAgreementDialogProps {
  hasAgreed: boolean;
}

/**
 * Asks existing users to accept the terms and privacy policy.
 */
export function TermsAgreementDialog({ hasAgreed }: TermsAgreementDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);

  const accept = useMutation(
    trpc.user.acceptTerms.mutationOptions({
      onSuccess: () => {
        toast.success("Thanks, that's recorded.");
        // Refetch so `hasAgreed` flips and this unmounts, rather than keeping a
        // local "dismissed" flag that would disagree with the server.
        queryClient.invalidateQueries({
          queryKey: trpc.user.getById.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Could not record your agreement");
      },
    }),
  );

  if (hasAgreed) return null;

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        className={cn("sm:max-w-md")}
      >
        <DialogHeader>
          <DialogTitle>Before you continue</DialogTitle>
          <DialogDescription>
            We&apos;ve updated our site&apos;s policy. Please confirm you accept
            our terms and privacy policy, it only takes a moment.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("flex items-center gap-3 py-2")}>
          <Checkbox
            id="accept-terms"
            checked={checked}
            disabled={accept.isPending}
            onCheckedChange={(value) => setChecked(value === true)}
            className={cn("mt-0.5")}
          />

          <Label
            htmlFor="accept-terms"
            className={cn(
              "text-sm leading-3 font-normal text-muted-foreground flex-wrap",
            )}
          >
            I agree to Soraxi&apos;s{" "}
            <Link
              href="/terms-conditions"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("font-medium text-soraxi-green hover:underline")}
            >
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("font-medium text-soraxi-green hover:underline")}
            >
              Privacy Policy
            </Link>
            .
          </Label>
        </div>

        <DialogFooter>
          <Button
            onClick={() => accept.mutate()}
            disabled={!checked || accept.isPending}
            className={cn(
              "w-full gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover",
            )}
          >
            {accept.isPending && <Spinner className={cn("size-4")} />}
            Agree and continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

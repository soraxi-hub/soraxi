"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useTRPC } from "@/trpc/client";

import { VendorCodeDialog } from "./vendor-code-dialog";

interface DeliveryLinkCardProps {
  orderId: string;
  subOrderId: string;
  /** Absolute rider link. Absent once the delivery is confirmed. */
  link: string | null;
}

/**
 * The vendor's delivery link, presented as a payout benefit rather than a chore.
 *
 * The QR is the primary sharing route and sits first: at the moment goods change
 * hands the vendor and rider are standing together, so the rider scans off the
 * screen and leaves. Copying a URL into WhatsApp is the fallback, not the
 * default.
 *
 * The link is **not** treated as sensitive — no warnings, no confirmation before
 * sharing. It grants only the ability to attempt a confirmation; the customer's
 * code is still required. Friction here costs real deliveries and buys nothing.
 */
export function DeliveryLinkCard({
  orderId,
  subOrderId,
  link,
}: DeliveryLinkCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentLink, setCurrentLink] = useState(link);

  useEffect(() => setCurrentLink(link), [link]);

  // Rendered client-side to a data URI so the QR never needs a network round
  // trip — this card is often opened on a poor connection just before handover.
  useEffect(() => {
    if (!currentLink) {
      setQr(null);
      return;
    }

    let active = true;

    QRCode.toDataURL(currentLink, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQr(url);
      })
      .catch(() => {
        // A missing QR is survivable — the copyable link below still works.
        if (active) setQr(null);
      });

    return () => {
      active = false;
    };
  }, [currentLink]);

  const regenerate = useMutation({
    ...trpc.deliveryProof.regenerateLink.mutationOptions(),
    onSuccess: ({ link: fresh }) => {
      setCurrentLink(fresh);
      toast.success("New link generated. The old one no longer works.");
      queryClient.invalidateQueries({
        queryKey: trpc.storeOrders.getStoreOrderById.queryKey({ orderId }),
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCopy = async () => {
    if (!currentLink) return;

    try {
      await navigator.clipboard.writeText(currentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  if (!currentLink) return null;

  return (
    <Card>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-soraxi-green">
            Get paid faster.
          </span>{" "}
          Share this link with whoever delivers. When they enter the
          customer&apos;s code, your payment is released straight away — no
          three-day wait.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="mx-auto shrink-0 sm:mx-0">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="QR code linking to the delivery confirmation page"
                // `bg-white` in both themes, deliberately. A QR code needs a
                // light quiet zone to scan; rendering it on a dark surface
                // defeats the camera and this is the primary sharing route.
                className="size-32 rounded-lg border border-border bg-white p-1 sm:size-36"
              />
            ) : (
              <Skeleton className="size-32 rounded-lg sm:size-36" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-xs text-muted-foreground">
              Have the rider scan this, or send them the link
            </p>

            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">
                {currentLink}
              </code>
              <Button
                type="button"
                size="sm"
                onClick={handleCopy}
                aria-label="Copy delivery link"
                className="shrink-0 gap-1.5 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
              >
                {copied ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Same weight as sharing the link, not hidden: a rider with no
                  smartphone is common, and this is the path for them. */}
              <VendorCodeDialog orderId={orderId} subOrderId={subOrderId}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-soraxi-green/50 text-soraxi-green hover:bg-soraxi-green/10"
                >
                  <KeyRound className="size-3.5" />
                  Enter code instead
                </Button>
              </VendorCodeDialog>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={regenerate.isPending}
                onClick={() => regenerate.mutate({ orderId, subOrderId })}
                className="gap-1.5"
              >
                {regenerate.isPending ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Regenerate link
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

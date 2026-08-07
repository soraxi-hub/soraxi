"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { DELIVERY_CODE_LENGTH } from "@/constants/delivery";
import { useTRPC } from "@/trpc/client";

import { CodeInput } from "./components/code-input";

/**
 * The rider-facing delivery confirmation page at `/d/[token]`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DESIGNED FOR THE WORST CONDITIONS ON THE PLATFORM
 * ─────────────────────────────────────────────────────────────────────────────
 * The person using this has no Soraxi account and may never have seen the brand.
 * They are outdoors, one-handed, holding a bag, possibly at night, on a cheap
 * Android with poor hostel connectivity, with the customer waiting. Everything
 * must be self-evident and nothing may require a second screen.
 *
 * Layout order is deliberate: **name first, code second.** The name can be
 * filled the moment they arrive; the code needs the customer. Leading with the
 * code would make the page look blocked at the instant it opens.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS PAGE MAY NEVER SHOW
 * ─────────────────────────────────────────────────────────────────────────────
 * Address, phone number, email, order value, other sub-orders, or the
 * customer's surname. Anyone the link is forwarded to sees this page — treat
 * everything on it as public.
 */
export function DeliveryConfirmationPage({ token }: { token: string }) {
  const trpc = useTRPC();

  const [riderName, setRiderName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const link = useQuery(
    trpc.deliveryConfirmation.getByToken.queryOptions({ token }),
  );

  const submit = useMutation({
    ...trpc.deliveryConfirmation.submitCode.mutationOptions(),
    onSuccess: () => {
      setError(null);
      link.refetch();
    },
    onError: (mutationError) => {
      // Shown inline on the input group rather than as a toast — a toast
      // disappears, and this person may look away mid-entry.
      setError(mutationError.message);
      setCode("");
      link.refetch();
    },
  });

  if (link.isLoading)
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );

  const data = link.data;

  if (!data || data.state === "invalid") {
    return (
      <PageShell>
        <Outcome
          tone="error"
          icon={<CircleAlert className="size-8" aria-hidden />}
          title="This link is no longer valid."
          body="Ask the vendor for a new delivery link."
        />
      </PageShell>
    );
  }

  // Success is derived from the mutation rather than a refetch, so the rider
  // sees confirmation the instant the server accepts it.
  if (submit.isSuccess) {
    return (
      <PageShell>
        <Outcome
          tone="success"
          icon={<CheckCircle2 className="size-8" aria-hidden />}
          title="Delivery confirmed."
          body="Thank you."
          rows={[
            ["Order", submit.data.orderNumber],
            ["Confirmed", formatStamp(submit.data.confirmedAt)],
            ["Name entered", submit.data.riderName],
          ]}
        />
      </PageShell>
    );
  }

  if (data.state === "already_confirmed") {
    return (
      <PageShell>
        {/* Neutral, not an error: the rider did nothing wrong and should leave
            knowing they are done. */}
        <Outcome
          tone="neutral"
          icon={<Clock className="size-8" aria-hidden />}
          title="Already confirmed"
          body="This delivery has already been confirmed. Nothing further to do."
          rows={[
            ["Order", data.orderNumber],
            ...(data.confirmedAt
              ? ([["Confirmed", formatStamp(data.confirmedAt)]] as [
                  string,
                  string,
                ][])
              : []),
            ...(data.confirmedBy
              ? ([["Confirmed by", data.confirmedBy]] as [string, string][])
              : []),
          ]}
        />
      </PageShell>
    );
  }

  const isLocked = data.state === "locked";
  const canSubmit =
    riderName.trim().length >= 2 &&
    code.length === DELIVERY_CODE_LENGTH &&
    !submit.isPending &&
    !isLocked;

  return (
    <PageShell>
      <OrderContext
        orderNumber={data.orderNumber}
        itemCount={data.itemCount}
        storeName={data.storeName}
        customerFirstName={data.customerFirstName}
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          submit.mutate({ token, riderName: riderName.trim(), code });
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="rider-name">Your name</Label>
          <Input
            id="rider-name"
            value={riderName}
            onChange={(event) => setRiderName(event.target.value)}
            placeholder="Who is delivering?"
            autoComplete="name"
            maxLength={60}
            disabled={submit.isPending || isLocked}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label>Delivery code</Label>
          <p className="text-sm text-muted-foreground">
            Ask the customer for their {DELIVERY_CODE_LENGTH}-digit delivery
            code.
          </p>

          <div className="pt-1">
            <CodeInput
              value={code}
              onChange={(next) => {
                setCode(next);
                if (error) setError(null);
              }}
              disabled={submit.isPending || isLocked}
              hasError={Boolean(error) || isLocked}
            />
          </div>

          {error && !isLocked && (
            <p
              role="alert"
              className="flex items-center justify-center gap-1.5 pt-1 text-sm text-soraxi-error"
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
        </div>

        {isLocked && (
          <div
            role="alert"
            className="rounded-lg border border-soraxi-error/40 bg-soraxi-error/10 p-3"
          >
            <p className="text-sm font-semibold text-soraxi-error">
              Too many attempts.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ask the vendor to confirm this delivery another way.
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="h-12 w-full gap-2 bg-soraxi-green text-base text-white hover:bg-soraxi-green-hover"
        >
          {submit.isPending && <Spinner className="size-4" />}
          {submit.isPending ? "Confirming..." : "Confirm delivery"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Only enter the code after you hand over the items.
        </p>
      </form>
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Page frame.
 *
 * Centred, capped narrow, and padded for thumbs. Light brand presence — enough
 * that a stranger trusts the page, not so much that it looks like marketing.
 */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-muted/30 px-3 py-6 sm:items-center sm:px-4 sm:py-10">
      <div className="w-full max-w-md rounded-xl border border-border bg-muted p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-soraxi-green text-xs font-bold text-white">
            S
          </span>
          <span className="font-semibold text-soraxi-green">Soraxi</span>
        </div>
        {children}
      </div>
    </main>
  );
}

function OrderContext({
  orderNumber,
  itemCount,
  storeName,
  customerFirstName,
}: {
  orderNumber: string;
  itemCount: number;
  storeName: string;
  customerFirstName: string;
}) {
  return (
    <div className="mb-5 border-b border-border pb-4">
      <h1 className="text-2xl font-bold">Confirm delivery</h1>
      <p className="mt-1 font-mono text-sm text-muted-foreground">
        {orderNumber} · {itemCount} {itemCount === 1 ? "item" : "items"}
      </p>
      {storeName && (
        <p className="text-sm text-muted-foreground">{storeName}</p>
      )}
      {customerFirstName && (
        <p className="text-sm text-muted-foreground">
          For: {customerFirstName}
        </p>
      )}
    </div>
  );
}

function Outcome({
  tone,
  icon,
  title,
  body,
  rows,
}: {
  tone: "success" | "neutral" | "error";
  icon: React.ReactNode;
  title: string;
  body: string;
  rows?: [string, string][];
}) {
  const toneClass = {
    success: "bg-soraxi-green/10 text-soraxi-green",
    neutral: "bg-muted text-muted-foreground",
    error: "bg-soraxi-error/10 text-soraxi-error",
  }[tone];

  return (
    <div className="py-4 text-center">
      <div
        className={cn(
          "mx-auto mb-4 flex size-16 items-center justify-center rounded-full",
          toneClass,
        )}
      >
        {icon}
      </div>

      <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>

      {rows && rows.length > 0 && (
        <dl className="mt-5 space-y-2 rounded-lg bg-muted/60 p-3 text-left text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium break-all">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

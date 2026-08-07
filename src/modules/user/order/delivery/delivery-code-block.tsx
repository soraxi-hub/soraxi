"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/**
 * The customer's 6-digit delivery code.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DESIGNED TO BE READ ALOUD AT A HOSTEL GATE
 * ─────────────────────────────────────────────────────────────────────────────
 * This gets used one-handed, outdoors, possibly at night, on a cracked screen,
 * with a rider waiting. So the digits are very large, tabular (so `1` occupies
 * the same width as `8` and the grouping never shifts), and split `482 917`
 * because six digits read aloud as one run get misheard.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SECOND LINE IS LOad-BEARING
 * ─────────────────────────────────────────────────────────────────────────────
 * "You can still report a problem afterwards" prevents the single most common
 * stall in the whole flow: a customer who believes handing over the code waives
 * their rights refuses to give it, and the delivery stalls at the door. The code
 * proves **receipt**, not **satisfaction** — condition and wrong-item disputes
 * remain fully available. That sentence is why it is on the card and not buried
 * in terms.
 */
export function DeliveryCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const grouped = `${code.slice(0, 3)} ${code.slice(3)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked on some mobile browsers and all non-secure
      // origins. Not worth an error — the code is on screen to be read out,
      // which is how it is used anyway.
      toast.info("Read the code out to the delivery person.");
    }
  };

  return (
    <div className="rounded-lg border border-dashed border-soraxi-green/50 bg-soraxi-green/5 p-4 text-center">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Your delivery code
      </p>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Delivery code ${code.split("").join(" ")}. Tap to copy.`}
        className={cn(
          "mt-2 block w-full rounded-md py-1 font-bold tabular-nums text-soraxi-green",
          "text-4xl tracking-[0.15em] sm:text-5xl",
          "transition-colors hover:bg-soraxi-green/10",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-soraxi-green",
        )}
      >
        {grouped}
      </button>

      <p className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {copied ? (
          <>
            <Check className="size-3 text-soraxi-green" aria-hidden />
            Copied
          </>
        ) : (
          "Tap the code to copy"
        )}
      </p>

      <p className="mt-3 text-sm text-muted-foreground">
        Give this to the delivery person only when you receive your items.
      </p>

      <p className="mt-3 rounded-md bg-background/70 p-2 text-xs text-muted-foreground">
        Giving this code confirms you received the items. You can still report a
        problem afterwards.
      </p>
    </div>
  );
}

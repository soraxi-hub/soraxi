"use client";

import { DeliveryStatus, deliveryStatusLabel } from "@/enums";
import { cn } from "@/lib/utils";

/** The happy path, in order. Terminal failure states sit outside it. */
const FORWARD_PATH: DeliveryStatus[] = [
  DeliveryStatus.Processing,
  DeliveryStatus.Shipped,
  DeliveryStatus.OutForDelivery,
  DeliveryStatus.Delivered,
];

/**
 * Progress along the delivery path.
 *
 * A stepper rather than a dropdown of every status, because these are not
 * equivalent choices — they are a sequence, and only one or two moves are ever
 * legal. Showing them as a list of options invited vendors to jump to
 * "Delivered" as casually as to "Shipped", which is precisely the habit proof
 * of delivery exists to break.
 *
 * Sub-orders that ended in cancellation, return or failed delivery leave the
 * path entirely; the stepper renders a single terminal chip for those instead
 * of pretending progress stopped midway.
 */
export function StatusStepper({ status }: { status: DeliveryStatus }) {
  const isTerminalFailure = ![
    ...FORWARD_PATH,
    DeliveryStatus.OrderPlaced,
  ].includes(status);

  if (isTerminalFailure) {
    return (
      <span className="inline-flex rounded bg-soraxi-error/15 px-3 py-1 text-xs font-medium text-soraxi-error">
        {deliveryStatusLabel(status)}
      </span>
    );
  }

  const currentIndex = FORWARD_PATH.indexOf(status);

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2">
      {FORWARD_PATH.map((step, index) => {
        const isDone = currentIndex >= index && currentIndex !== -1;
        const isCurrent = currentIndex === index;

        return (
          <li key={step} className="flex items-center gap-1">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors",
                isCurrent && "bg-soraxi-green text-white",
                isDone && !isCurrent && "bg-soraxi-green/15 text-soraxi-green",
                !isDone && "bg-muted text-muted-foreground",
              )}
            >
              {deliveryStatusLabel(step)}
            </span>

            {index < FORWARD_PATH.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px w-3 sm:w-5",
                  currentIndex > index ? "bg-soraxi-green/40" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

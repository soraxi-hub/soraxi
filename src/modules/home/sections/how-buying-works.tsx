import { KeyRound, Search, Wallet } from "lucide-react";

import { DELIVERY_CODE_LENGTH } from "@/constants/delivery";

import { SectionHeading } from "./section-heading";

/**
 * Three steps, ending on the delivery code.
 *
 * The code is the part worth explaining: a buyer who does not know they are
 * meant to withhold it until the goods are in their hands hands it over on
 * arrival, which releases escrow early and removes the protection step two
 * just promised.
 */
const STEPS = [
  {
    icon: Search,
    label: "Step 1",
    title: "Find it on campus",
    body: "Browse by category or search for what you need. Prices are in naira, no surprises at checkout.",
  },
  {
    icon: Wallet,
    label: "Step 2",
    title: "Pay securely",
    // Not "pay online or on delivery" — there is no cash-on-delivery path in
    // checkout, so offering one here would strand anyone who chose it.
    body: "Pay online and we hold the money until the item reaches you.",
  },
  {
    icon: KeyRound,
    label: "Step 3",
    title: "Confirm with your code",
    body: `Give the rider your ${DELIVERY_CODE_LENGTH}-digit delivery code. That releases payment to the vendor.`,
  },
] as const;

export function HowBuyingWorks() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title="How buying works"
          subtitle="Three steps, from search to delivery"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, label, title, body }) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-transparent p-5"
            >
              <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Icon className="size-4 text-soraxi-green" aria-hidden />
                {label}
              </p>

              <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

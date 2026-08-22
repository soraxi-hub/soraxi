import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * What a vendor gets, stated in the terms they actually get it on.
 *
 * The fee line is deliberately not a single headline percentage. Soraxi charges
 * 5% *plus* a tiered flat fee — ₦100 below ₦2,500 and ₦200 at ₦5,000 and above
 * (see `calculateCommission`) — so any bare "x% per item" promise on a landing
 * page is one a vendor can disprove with their first payout. The delivery-fee
 * claim is safe: commission is charged on the products subtotal only, never on
 * shipping (see `buildSubOrderFinancials`).
 */
const BENEFITS = [
  "No monthly fee — 5% plus a small fixed fee per sale",
  "You keep the full delivery fee",
  "Payouts to any Nigerian bank",
] as const;

export function VendorCta() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="rounded-2xl bg-soraxi-green p-6 text-white sm:p-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-white/80">
            For vendors
          </p>

          <h2 className="mt-2 max-w-[18ch] text-2xl font-bold sm:text-3xl">
            Sell to your campus without a shop front.
          </h2>

          <p className="mt-4 max-w-prose text-sm text-white/90">
            List your products, set your own delivery fee, and get paid to your
            bank account once the customer confirms delivery. Setup takes about
            ten minutes.
          </p>

          <ul className="mt-6 space-y-2">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/*
            Full-width stacked buttons on mobile: side by side at 375px leaves
            each about 150px, which truncates "See vendor guide".
          */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              className="bg-white text-soraxi-green hover:bg-white/90"
            >
              <Link href="/store/onboarding">Create your store</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/docs/storefront/create-storefront">
                See vendor guide
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

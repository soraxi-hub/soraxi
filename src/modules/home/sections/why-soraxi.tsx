import { Lock, MessageCircle, ShieldCheck, Truck } from "lucide-react";

/**
 * The four promises, as a quiet band between the product grid and the
 * explainer.
 *
 * Every line here describes something the platform actually does — stores are
 * reviewed before opening, funds sit in escrow until the buyer confirms, and
 * threads exist per product and per order. Nothing aspirational: this band is
 * the first thing a sceptical first-time buyer reads, and a claim they can
 * disprove in one order costs more than it wins.
 */
const PROMISES = [
  {
    icon: ShieldCheck,
    title: "Verified vendors",
    body: "Every store is reviewed before it opens",
  },
  {
    icon: Truck,
    title: "Delivery within campus",
    body: "Hostel to hostel, usually the same day",
  },
  {
    icon: Lock,
    title: "Your money is held safe",
    body: "Vendors are paid after you confirm delivery",
  },
  {
    icon: MessageCircle,
    title: "Talk to the seller",
    body: "Ask about an item before you pay",
  },
] as const;

export function WhySoraxi() {
  return (
    <section className="bg-muted/40 py-12">
      <div className="mx-auto max-w-7xl px-6">
        {/*
          Two across on a phone rather than four: at 375px a four-column split
          leaves roughly 80px per item, which breaks "Delivery within campus"
          across three lines.
        */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-soraxi-green/10">
                <Icon className="size-5 text-soraxi-green" aria-hidden />
              </span>

              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <p className="mt-1 max-w-[22ch] text-xs text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

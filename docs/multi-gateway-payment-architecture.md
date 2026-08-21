# Multi-Gateway Payment Architecture — Discussion Summary

> **Status: implemented, with documented divergences. Superseded by
> FINANCIAL_ARCHITECTURE.md §16–§17 as the description of what actually
> exists.**
>
> This document is kept as the design record — the reasoning that led to the
> build. Where the implementation departed from it, the reason is noted inline
> below. Read §16–§17 of FINANCIAL_ARCHITECTURE.md for current behaviour.
>
> **Build status against the plan at the end of this document:**
>
> | Step | Status |
> | ---- | ------ |
> | 1. Adapter interface + factory | Done |
> | 2. Second gateway + webhook handling | Done — Paystack built and tested, but gated off pending a refund client and one live payment |
> | 3. Bounded status-page UX | Done |
> | 4. Reconciliation with gateway dimension | **Part A done** (ledger dimension + per-gateway collections). **Part B not started** — settlement-report comparison is blocked on credentials, settlement-lag handling, and transaction volume |

## The Core Problem

Soraxi currently runs on a single payment processor (Flutterwave). This is a single point of failure — a gateway outage (scheduled upgrade or otherwise) takes down checkout entirely. The fix is to introduce additional payment gateways, but that introduces a chain of new problems that all had to be worked through:

1. How do we know which gateway a given transaction actually used, so we call the right `verifyTransaction` API?
2. Won't looking that up slow down the checkout status page?
3. If we can't verify instantly, what does the user see while waiting?
4. If money is now split across multiple gateway accounts, how do we still trust our escrow reconciliation numbers?

---

## 1. Determining Which Gateway Was Used

**Problem:** On the checkout status page, we need to call `verifyTransaction` — but on which gateway's API?

**Solution:** Don't detect it after the fact — record it at initiation and treat that as the source of truth.

- When the user selects a gateway at checkout, save `paymentProvider` (e.g. `"flutterwave"`) on the `Transaction`/`Order` record **before** redirecting.
- Generate an internal reference (`txRef`) at the same time and pass it to the gateway. This is what comes back on redirect/callback regardless of gateway.
- On the status page, look up the transaction by `txRef` in the DB — the record already tells you the gateway. No guessing required.
- Use a `PaymentGatewayFactory` to hand back the correct adapter for that provider.

**Design pattern (fits existing DDD conventions — QueryBuilder, Decorator, etc.):**

```ts
interface PaymentGatewayAdapter {
  initiate(payload: InitiatePaymentDTO): Promise<InitiateResult>;
  verifyTransaction(reference: string): Promise<VerificationResult>;
}

class FlutterwaveAdapter implements PaymentGatewayAdapter { ... }
class PaystackAdapter implements PaymentGatewayAdapter { ... }

class PaymentGatewayFactory {
  static create(provider: PaymentProvider): PaymentGatewayAdapter {
    switch (provider) {
      case "flutterwave": return new FlutterwaveAdapter();
      case "paystack": return new PaystackAdapter();
    }
  }
}
```

**Guardrails:**

- Never trust a `provider` query param from the URL alone — cross-check against the DB record to prevent a manipulated URL from triggering a mismatched verify call.

> **Divergence — the gateway is not customer-selected.** This section assumes
> "the user selects a gateway at checkout". The implementation has **no gateway
> picker**: `GatewayRouter` chooses server-side, with failover on initiation
> failure. A picker does not actually solve the stated problem — when a gateway
> is down, customers who habitually pick it still hit a dead checkout — and it
> gives away the ability to steer volume as fee schedules diverge. The
> consequence is that an enabled second gateway becomes a *silent* failover
> target. See FINANCIAL_ARCHITECTURE.md §16.

> **Divergence — no namespaced `txRef` prefixes.** An earlier version of this
> plan suggested prefixing references per gateway (`FLW-`, `PSK-`) as a fallback
> way to infer the provider. Dropped: the reference *is* the cart idempotency
> key, already used to look the order up from the status page, and prefixing it
> would ripple through webhook metadata, order lookup and the cart flow for
> marginal benefit. The order record is the sole source of provider truth.

---

## 2. The Latency Concern

**Problem:** Querying the DB for the order, deriving the provider, then calling `verifyTransaction`, then relaying the result to the customer — feels like it could take over a minute.

**Reality check:** The DB lookup on an indexed field is single-digit milliseconds — not the bottleneck. The actual cost is the **network round trip** to the gateway's API: request travels to the gateway's server, gets processed, travels back. That's typically 200ms–a few seconds, and it's unavoidable no matter how the surrounding code is architected — you always have to make that call _at some point_ to know if payment succeeded.

**Conclusion:** The fix isn't optimizing the lookup — it's not making the customer wait on the live gateway call at all.

---

## 3. Webhook-Driven Verification (Not Request-Driven)

**Solution architecture:**

1. Gateway sends a webhook to the backend the moment payment completes (success/failure) — usually within seconds.
2. Webhook handler verifies the signature, calls `verifyTransaction` server-side to confirm, and updates the order status in the DB (`pending` → `success`/`failed`).
3. The checkout status page **never calls the gateway directly**. It polls (or subscribes via websocket/SSE) to Soraxi's own `/order-status/:txRef` endpoint — a fast DB read.
4. If the webhook hasn't landed yet, the page shows "confirming payment…" and keeps polling every 2–3s.

This decouples customer-facing latency ("how fast is our own DB") from gateway latency ("how fast is Flutterwave/Paystack's API"). `verifyTransaction` is still called for real confirmation — it just happens in the background, not in the customer's wait path.

---

## 4. Bounding the "Confirming Payment" State

**Problem:** An indefinite "confirming payment" spinner is bad UX and a support-ticket generator.

**Solution — layered, time-boxed flow:**

| Time                    | Behavior                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0–10s                   | Page polls `/order-status/:txRef` every 2–3s, shows "Confirming your payment…"                                                                                               |
| ~10–15s (still pending) | Backend actively calls the gateway's `verifyTransaction` directly as a fallback (doesn't rely purely on the webhook), updates DB                                             |
| ~30–45s (still pending) | UI switches to an honest message: "This is taking longer than usual — we'll email you once confirmed." User can leave the page.                                              |
| Backstop                | A cron job (extending the existing 3am/3:30am reconciliation cron pattern) sweeps orders still `pending` after N minutes, force-verifies against the gateway, and reconciles |

Most webhooks land in 2–5 seconds, so most users never see past step 1. No order is ever permanently stuck, and nothing depends on the customer keeping the tab open.

> **Built as designed**, with concrete values: 2.5s poll, fallback verification
> at 12s, honest hand-off at 40s, cron sweep daily.
>
> **What this plan missed:** it assumed the cron "force-verifies and
> reconciles", which quietly assumes verification always yields an answer. For
> an **abandoned** checkout it does not — no gateway sends a webhook when a
> customer walks away, and verification returns "no such transaction", which the
> original contract could not distinguish from "gateway unreachable". Sweeping
> such an order therefore changed nothing, forever. Closing that required a
> third verification outcome and two expiry rules. See
> FINANCIAL_ARCHITECTURE.md §17.

---

## 5. Reconciliation Impact of Multiple Gateways

**Problem:** With money now sitting across multiple gateway accounts, verifying that escrow holdings are correct requires summing balances across all of them — not just one.

**Solution:**

- **Extend the ledger with a gateway dimension.** Add a `gatewayProvider` field to `LedgerLine`/`JournalEntry` (alongside existing categories like `PLATFORM_ESCROW`, `GATEWAY_FEE_DEDUCTED`), so the ledger can be sliced per gateway at query time without needing separate ledgers.
- **Reconcile in two layers:**
  1. **Per-gateway check** — sum internal ledger lines tagged with each `gatewayProvider`, compare against that gateway's own balance/settlement report. Catches gateway-specific issues early (as already happened with Flutterwave's net-of-fee settlement).
  2. **Aggregate check** — total across all gateways should equal the sum of _passing_ per-gateway checks, not a standalone comparison (otherwise one gateway's discrepancy can hide inside a coincidentally-matching total).

**Two things that will bite if skipped:**

- **Fee schedules differ per gateway** — each new gateway likely needs its own fee-deduction logic feeding into `GATEWAY_FEE_DEDUCTED`, since gross-vs-net settlement isn't universal (Flutterwave's 1.4% + VAT precedent).
- **Settlement timing differs per gateway** — a gateway's live balance often lags actual transactions by T+1 or more. Reconcile against that gateway's settlement report for the matching window, not a raw live balance, or every run produces false-positive discrepancies.

**Structural tie-in:** Each `PaymentGatewayAdapter` can expose `getBalance()` / `getSettlementReport()` alongside `verifyTransaction()`, so the reconciliation cron simply loops over registered adapters instead of hardcoding gateway-specific logic.

> **Split into Part A (built) and Part B (not built).**
>
> **Part A — the ledger dimension.** `gatewayProvider` lives on `LedgerLine`,
> not `JournalEntry` as this plan offered as an alternative: every use is an
> aggregation over that collection, so it is a `$match` there versus a `$lookup`
> join per query. `checkCollectionsByGateway` produces the per-gateway figures.
>
> **Part B — the outward comparison.** Not started. No adapter exposes
> `getBalance()` or `getSettlementReport()`. Blocked on live credentials, the
> settlement-lag problem this document itself flags, and having any transaction
> volume to reconcile.
>
> **Two refinements this plan did not anticipate:**
>
> - **Payouts must be excluded from per-gateway collections figures.** They are
>   attributed to the *disbursing* gateway, which need not be the collecting one
>   — Soraxi can take a payment on one provider and pay out through another.
>   Consequence: per-gateway totals **do not sum to `PLATFORM_ESCROW`**, and the
>   "aggregate check" described above therefore cannot be a simple total. The
>   whole-ledger checks remain `checkEscrowSolvency` and
>   `checkLedgerAccountingIdentity`.
> - **Untagged escrow must be surfaced, not absorbed.** Cash that moved without
>   a recorded gateway is reported separately and treated as a discrepancy;
>   folding it into a total would let it hide inside whichever provider looked
>   closest — the same failure mode this document warns about for the aggregate
>   check.

---

## Effort & Build Order

This is realistically a **multi-day to multi-week** effort — it's infrastructure, not a feature ticket. It touches: adapter abstraction, webhook infrastructure, a bounded-wait UX, and a new dimension in the reconciliation system.

**Recommended build order:**

1. **Adapter interface + factory** — wrap the existing Flutterwave integration in the `PaymentGatewayAdapter` pattern first, before adding a second gateway. Low risk, no behavior change.
2. **Second gateway + webhook handling** — the core of the work.
3. **Bounded status-page UX** — fairly contained once webhooks are working.
4. **Reconciliation with `gatewayProvider` dimension** — last, since it needs real transaction volume through the new gateway to test against.

Steps 1–2 alone already solve the original problem (single gateway = single point of failure). Reconciliation can follow once a second gateway is live and generating real data.

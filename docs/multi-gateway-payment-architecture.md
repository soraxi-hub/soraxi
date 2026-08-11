# Multi-Gateway Payment Architecture — Discussion Summary

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
- Namespace internal `txRef`s per gateway (`FLW-`, `PSK-`) as a fallback way to infer the gateway if a DB lookup ever fails.

---

## 2. The Latency Concern

**Problem:** Querying the DB for the order, deriving the provider, then calling `verifyTransaction`, then relaying the result to the customer — feels like it could take over a minute.

**Reality check:** The DB lookup on an indexed field is single-digit milliseconds — not the bottleneck. The actual cost is the **network round trip** to the gateway's API: request travels to the gateway's server, gets processed, travels back. That's typically 200ms–a few seconds, and it's unavoidable no matter how the surrounding code is architected — you always have to make that call *at some point* to know if payment succeeded.

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

| Time | Behavior |
|---|---|
| 0–10s | Page polls `/order-status/:txRef` every 2–3s, shows "Confirming your payment…" |
| ~10–15s (still pending) | Backend actively calls the gateway's `verifyTransaction` directly as a fallback (doesn't rely purely on the webhook), updates DB |
| ~30–45s (still pending) | UI switches to an honest message: "This is taking longer than usual — we'll email you once confirmed." User can leave the page. |
| Backstop | A cron job (extending the existing 3am/3:30am reconciliation cron pattern) sweeps orders still `pending` after N minutes, force-verifies against the gateway, and reconciles |

Most webhooks land in 2–5 seconds, so most users never see past step 1. No order is ever permanently stuck, and nothing depends on the customer keeping the tab open.

---

## 5. Reconciliation Impact of Multiple Gateways

**Problem:** With money now sitting across multiple gateway accounts, verifying that escrow holdings are correct requires summing balances across all of them — not just one.

**Solution:**

- **Extend the ledger with a gateway dimension.** Add a `gatewayProvider` field to `LedgerLine`/`JournalEntry` (alongside existing categories like `PLATFORM_ESCROW`, `GATEWAY_FEE_DEDUCTED`), so the ledger can be sliced per gateway at query time without needing separate ledgers.
- **Reconcile in two layers:**
  1. **Per-gateway check** — sum internal ledger lines tagged with each `gatewayProvider`, compare against that gateway's own balance/settlement report. Catches gateway-specific issues early (as already happened with Flutterwave's net-of-fee settlement).
  2. **Aggregate check** — total across all gateways should equal the sum of *passing* per-gateway checks, not a standalone comparison (otherwise one gateway's discrepancy can hide inside a coincidentally-matching total).

**Two things that will bite if skipped:**
- **Fee schedules differ per gateway** — each new gateway likely needs its own fee-deduction logic feeding into `GATEWAY_FEE_DEDUCTED`, since gross-vs-net settlement isn't universal (Flutterwave's 1.4% + VAT precedent).
- **Settlement timing differs per gateway** — a gateway's live balance often lags actual transactions by T+1 or more. Reconcile against that gateway's settlement report for the matching window, not a raw live balance, or every run produces false-positive discrepancies.

**Structural tie-in:** Each `PaymentGatewayAdapter` can expose `getBalance()` / `getSettlementReport()` alongside `verifyTransaction()`, so the reconciliation cron simply loops over registered adapters instead of hardcoding gateway-specific logic.

---

## Effort & Build Order

This is realistically a **multi-day to multi-week** effort — it's infrastructure, not a feature ticket. It touches: adapter abstraction, webhook infrastructure, a bounded-wait UX, and a new dimension in the reconciliation system.

**Recommended build order:**

1. **Adapter interface + factory** — wrap the existing Flutterwave integration in the `PaymentGatewayAdapter` pattern first, before adding a second gateway. Low risk, no behavior change.
2. **Second gateway + webhook handling** — the core of the work.
3. **Bounded status-page UX** — fairly contained once webhooks are working.
4. **Reconciliation with `gatewayProvider` dimension** — last, since it needs real transaction volume through the new gateway to test against.

Steps 1–2 alone already solve the original problem (single gateway = single point of failure). Reconciliation can follow once a second gateway is live and generating real data.

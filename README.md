# Soraxi

Soraxi is a multi-vendor marketplace where independent vendors sell, buyers pay into escrow, and funds settle out to vendors only after delivery or dispute resolution.

The core of the system is a five-stage financial ledger — payment settlement, funds release, disputes, vendor payouts, and refunds — sitting behind a provider-neutral payment layer. Payments can be initiated through either of two gateways (Flutterwave, Paystack) without the settlement logic ever knowing which one was used; all money is tracked as integer Kobo throughout, so no part of the ledger does floating-point arithmetic on currency.

## Stack

- **Framework:** Next.js (App Router), React, TypeScript (`strict` mode)
- **API:** tRPC
- **Database:** MongoDB / Mongoose
- **Auth:** JWT (jose)
- **Payments:** Flutterwave, Paystack
- **UI:** Tailwind CSS, Radix UI
- **Testing:** Vitest, mongodb-memory-server

## Getting started

```bash
npm install
npm run dev
```

The app expects environment variables for the database connection, auth secrets, payment gateway keys, and email/image-upload providers — see `.env.local` for the variables this project reads.

## Testing

```bash
npm test        # run the suite once
npm run test:watch
```

The financial suite (`tests/financial/`) exercises the full settlement lifecycle — payment, release, disputes, payouts, and refunds — against a real (in-memory) MongoDB instance, with invariant checks asserting the ledger stays consistent at every stage.

## Documentation

Architecture and design notes live in [`docs/`](docs/):

- [`FINANCIAL_ARCHITECTURE.md`](docs/FINANCIAL_ARCHITECTURE.md) — the escrow settlement ledger
- [`multi-gateway-payment-architecture.md`](docs/multi-gateway-payment-architecture.md) — the provider-neutral payment layer
- [`PROOF_OF_DELIVERY.md`](docs/PROOF_OF_DELIVERY.md) — delivery confirmation and dispute triggers
- [`IN_APP_MESSAGING.md`](docs/IN_APP_MESSAGING.md) — buyer/vendor messaging
- [`ddd_architecture_readme_guide.md`](docs/ddd_architecture_readme_guide.md) — how the codebase is organized
- [`cron-schedules.md`](docs/cron-schedules.md) — scheduled jobs (reconciliation, auto-confirmation, dispute expiry, etc.)

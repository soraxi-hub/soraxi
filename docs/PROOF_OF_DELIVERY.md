# Soraxi Proof of Delivery — Architecture Documentation

> **Platform:** Soraxi Marketplace
> **Last Updated:** August 2026
> **Audience:** Internal developers and new team members
> **Status:** Living document — update as the system evolves

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Mechanism](#2-the-mechanism)
3. [Who Sees What](#3-who-sees-what)
4. [Data Model](#4-data-model)
5. [Security Model](#5-security-model)
6. [The Confirmation Flow](#6-the-confirmation-flow)
7. [Money and Settlement](#7-money-and-settlement)
8. [The Rider Page](#8-the-rider-page)
9. [Vendor Surfaces](#9-vendor-surfaces)
10. [Customer Surfaces](#10-customer-surfaces)
11. [Admin: The Delivery Record](#11-admin-the-delivery-record)
12. [Notifications](#12-notifications)
13. [Constants and Tunables](#13-constants-and-tunables)
14. [File Inventory](#14-file-inventory)
15. [How To Extend It](#15-how-to-extend-it)
16. [Testing and Verification](#16-testing-and-verification)
17. [Known Gaps and Future Work](#17-known-gaps-and-future-work)

---

## 1. The Problem

### What was broken

A vendor marked a sub-order **Delivered** and nothing backed that claim. Three days
later `OrderAutoConfirmService` released the escrowed funds. Customer silence
became payment.

So a dishonest vendor could mark a sub-order out for delivery, deliver nothing,
and be paid — unless the customer noticed and disputed inside 72 hours.

### Why the dispute system couldn't fix it

`DisputeRecord.evidence` collects **image URLs from the customer**. But *you
cannot photograph an absence*. A customer claiming non-delivery has literally
nothing to submit, while the vendor is asked for nothing at all.

The asymmetry was the bug: the burden of proof sat with the only party
structurally incapable of discharging it.

### The fix

A **6-digit code held by the customer**, handed over at the door, entered by
whoever delivers. Entering it is affirmative evidence the buyer was present and
released it. It defeats fraud in both directions at once — a vendor cannot
fabricate delivery, and a customer cannot take the goods then claim they never
arrived.

### Why vendors cooperate

**Code entered → escrow releases immediately. No 3-day wait.**

This is not compliance we impose; it is a *faster payout* vendors earn by
collecting proof. Every vendor-facing surface is written that way (§9).

---

## 2. The Mechanism

```
  ORDER PLACED
       │
  VENDOR: Processing
       │
       ▼
  VENDOR: Shipped ─────────► code + link minted together
       │                     ├─► customer sees the code (order page + email)
       │                     └─► vendor sees a link + QR (never the code)
       ▼
  HANDOVER AT THE DOOR
       │   rider opens the link, types their name + the customer's code
       ▼
  DELIVERED (proven) ──────► escrow releases immediately
```

### Why both are minted at `Shipped`

The delivery state machine permits **`Shipped → Delivered` directly**, skipping
`OutForDelivery`. Minting on any later transition would leave a legal route to
delivery with no code in existence.

`Shipped` is also the earliest point `Delivered` is reachable, so nothing is
issued sooner than it needs to be — and it matches the customer's Processing
card, which reads *"your delivery code appears here once it's on the way."*

### Two artefacts, two audiences

| Artefact | Held by | Purpose |
|---|---|---|
| **6-digit code** | Customer only | Proves the buyer was present |
| **Link + QR** | Vendor → passed to rider | A keyboard to enter the code |

They never overlap. See §5.

---

## 3. Who Sees What

| | Code | Link/token | Rider name |
|---|:---:|:---:|:---:|
| Customer | ✅ until used | ❌ never | ✅ after delivery |
| Vendor | ❌ **never** | ✅ | ✅ after delivery |
| Rider (via link) | ❌ enters it | ✅ | ✅ types it |
| Admin | ❌ never | ❌ never | ✅ in dispute view |

> ⚠️ **The vendor must never see the code.** A vendor who can read it confirms
> their own delivery and is paid for goods never handed over — the single
> failure that makes this entire feature pointless.
>
> This was a real bug during development: `toStoreJSON` spread `...subOrder`,
> and once `deliveryProof` lived on the sub-order, the vendor's API response
> contained the plaintext code. See §5.2 for how it is now prevented at compile
> time.

---

## 4. Data Model

Proof state lives on the **sub-order**, not in a separate collection — it is
per-store and has exactly the same lifetime as the sub-order it belongs to.

`IDeliveryProof` in [order.model.ts](src/lib/db/models/order.model.ts):

```ts
{
  // The customer's secret
  code?: string,
  codeGeneratedAt?: Date,

  // The rider's link
  token?: string,
  tokenCreatedAt?: Date,
  tokenExpiresAt?: Date,      // +48h from despatch

  // The control that actually protects the code
  attempts: number,
  lockedAt?: Date,            // terminal — no timer, no reset

  // The outcome
  method?: DeliveryProofMethodEnum,
  confirmedAt?: Date,
  riderName?: string,         // self-reported, unverified
}
```

### Index

```
orders: { "subOrders.deliveryProof.token": 1 }   (sparse)
```

The rider page resolves an order **from a link token and nothing else** — there
is no session to narrow the query by. Sparse because only shipped sub-orders
carry a token.

### `DeliveryProofMethodEnum`, ordered by evidential strength

| Method | Meaning | Strength |
|---|---|---|
| `customer_in_app` | Buyer confirmed from their own account | Strongest |
| `code_by_rider` | Code typed on the public link | Strong |
| `code_by_vendor` | Same code, read over the phone, typed by the vendor | Strong |
| `vendor_declared` | Vendor's unverified assertion | Weak |

`code_by_vendor` is **not** weaker than `code_by_rider`. Both are buyer-attested
— the customer released the code either way; only the keyboard differs. The
distinction is preserved because an admin may want it, not because it changes
the weight.

---

## 5. Security Model

### 5.1 The link is not the secret — the code is

A tokenised link confirms nothing on its own. Whoever holds it still needs six
digits only the customer has. The link is a **keyboard**, not a **key**.

This has a direct UI consequence: **the link is deliberately not protected**. No
"keep this private" warnings, no confirmation before sharing. It is meant to be
forwarded over WhatsApp. Friction there costs real deliveries and buys nothing.

The control that *does* protect the code is `MAX_DELIVERY_CODE_ATTEMPTS = 3`.
Six digits with unlimited guesses is no protection; with three attempts it is a
3-in-a-million chance and no way to work offline.

### 5.2 Audience-scoped projections

`IDeliveryProof` is **never spread into a response**. Everything goes through
one of three explicit allow-lists in
[delivery-proof-projection.ts](src/domain/orders/delivery-proof-projection.ts):

| Projection | Contains | Excludes |
|---|---|---|
| `toCustomerProofView` | code (until used), method, rider name | **token** |
| `toVendorProofView` | token, attempts, lock state, method | **code** |
| `toAdminProofView` | method, strength, rider name | **both** |

`deliveryProof` is **omitted from the shared `ISubOrderInfo` type**, so leaking
the raw field is a **compile error**, not a silent mistake. TypeScript caught
two further call sites the moment this was introduced.

### 5.3 Both secrets are stored in plaintext, deliberately

Both must be **retrievable**, not merely verifiable: the customer's order page
renders the code on every visit, and the vendor re-copies the link for each
rider. A one-way hash cannot serve either screen.

Hashing would also buy very little. A 6-digit code has a million possibilities —
anyone with database read access brute-forces a hash of it offline in
milliseconds. Constant-time comparison is still used (`verifyDeliveryCode`),
because response timing is an *online* side channel that the attempt limit does
not close.

> **Future hardening:** encrypting the code at rest with a KMS key keeps it
> retrievable while protecting it from casual database exposure — backups, logs,
> support tooling. That is a key-management project, deliberately deferred.

### 5.4 What the rider page must never expose

Address, phone number, email, order value, other sub-orders, or the customer's
surname. Anyone the link is forwarded to sees that page — treat everything on it
as public. It shows only: order reference, item count, store name, and the
customer's **first name**.

### 5.5 Unknown and expired look identical

`resolveToken` returns `null` for unknown, expired *and* retired tokens alike.
Distinguishing them would hand anyone probing links a free oracle.

---

## 6. The Confirmation Flow

`DeliveryProofService.confirmWithCode()` —
[delivery-proof.service.ts](src/services/orders/delivery-proof.service.ts)

```
  1. re-read the sub-order INSIDE the transaction
  2. reject if locked
  3. reject if already delivered
  4. verify the code (constant time)
       └─ wrong → abort tx, then persist the attempt, then throw
  5. ┌─ TRANSACTION ─────────────────────────────┐
     │  mark Delivered + statusHistory entry     │
     │  record proof (method, time, rider name)  │
     │  set customerConfirmedDelivery            │
     │  retire the token                         │
     │  settleSuborder(trigger: DELIVERY_CODE)   │
     └───────────────────────────────────────────┘
  6. publish delivery.confirmed → thread notice
```

### Why the failed attempt is recorded outside the transaction

An aborted transaction would **roll the counter back**, handing an attacker
unlimited guesses. `recordFailedAttempt` is therefore its own atomic
`findOneAndUpdate`, deliberately outside any session.

This is the single most important implementation detail in the file. It is
covered by a test asserting the counter survives the rollback.

### Why the sub-order is re-read inside the transaction

The caller resolved the sub-order to render a page. Between then and now the
customer may have confirmed in their own app, or another rider may have used a
second link. Both happen at the doorstep and are not hypothetical.

### Token retirement

On success the token is cleared, so a forwarded link cannot replay and no longer
resolves to a live page. Same on `declareWithoutProof` — there is nothing left
for a rider to confirm.

---

## 7. Money and Settlement

### 7.1 One shared settlement path

Escrow release has three callers: the customer confirming in-app, the nightly
auto-confirm cron, and a delivery code being entered. They differ only in what
triggered them.

Left as three copies, the ledger write, financial-status update and wallet move
would drift apart the first time one was edited — and **drift here is a money
bug, not a display bug**. There is exactly one implementation:

[`settleSuborder()`](src/services/orders/suborder-settlement.service.ts) with a
`SettlementTrigger` of `CUSTOMER_CONFIRMATION | AUTO_CONFIRMATION |
DELIVERY_CODE`.

It performs, in one transaction:

```
  JournalEntryWriter.writeFundsReleased(...)   ledger
  updateSuborderFinancialStatus(→ SETTLED)     transaction record
  releaseVendorPendingToAvailable(...)         wallet: pending → available
```

### 7.2 Idempotency

A sub-order that has already left `PENDING` — settled, disputed, refunded —
returns `{ settled: false }` rather than throwing. Double-release is the worst
possible outcome, and this guard is what prevents it when two paths race (a
customer confirming at the same moment a rider enters the code).

### 7.3 What each path earns

| Path | Marks delivered | Releases escrow |
|---|:---:|:---:|
| Code entered by rider | ✅ | ✅ **immediately** |
| Code entered by vendor | ✅ | ✅ **immediately** |
| Customer confirms in app | ✅ | ✅ immediately |
| **Vendor declares without proof** | ✅ | ❌ **normal 3-day timer** |

That last row is the entire incentive. `declareWithoutProof` deliberately does
**not** call `settleSuborder`, and a test asserts the financial status stays
`pending` afterwards.

### 7.4 Decisions taken, and their residual risk

Two product decisions were made explicitly and are recorded here so nobody
"discovers" them later as bugs:

- **No-proof deliveries still auto-release after 3 days.**
  `AUTO_CONFIRM_DAYS` is unchanged at 3. A vendor who never collects proof is
  still paid on their own say-so after 72 hours, exactly as before — the
  incentive is *faster*, not *the only way*. Lengthening this window is a
  one-constant change if the fraud rate justifies it.

- **No withdrawal hold on code-confirmed funds.**
  Instant release moves money to the vendor's `available` balance, which they
  can request to withdraw. Disputes freeze from that same balance, so a vendor
  who withdraws before a customer disputes leaves nothing to freeze. The only
  mitigation is that payouts run on a daily cron, giving up to ~24h of natural
  delay. If this becomes a real problem, the fix is a `withdrawableFrom`
  timestamp on the wallet entry — not a redesign.

---

## 8. The Rider Page

**Route:** `/d/[token]` · unauthenticated · `robots: noindex, nofollow`

Sits outside every route group: no header, no sidebar, no auth. The person
opening it is not a Soraxi user and should see one self-contained card.

### Designed for the worst conditions on the platform

No account, possibly no prior contact with the brand, outdoors, one-handed,
holding a bag, possibly at night, on a cheap Android with poor hostel wifi, with
the customer waiting.

- **Name first, code second.** The name can be filled on arrival; the code needs
  the customer. Leading with the code makes the page look blocked the instant it
  opens.
- Errors render **on the input group**, not as a toast — a toast vanishes, and
  this person may glance away mid-entry.
- `inputMode="numeric"` raises the keypad; boxes auto-advance; backspace steps
  back; pasting fills all six.

### Seven states

| State | Behaviour |
|---|---|
| Ready | Both fields |
| Submitting | Spinner, inputs locked — assume a slow connection |
| Wrong code | Inline error with attempts remaining; name retained |
| Locked out | After 3 failures. Terminal, and tells them **what to do next** |
| Success | Order ref, timestamp, name entered |
| Already confirmed | **Neutral, not an error** — the rider did nothing wrong |
| Invalid / expired | One generic message (§5.5) |

### The 320px constraint

The code input is **fluid, not fixed**. Six 48px boxes plus gaps and the group
spacer come to 326px, which overflows a 320px phone (264px usable inside page
and card padding) *and* a 360px one. `flex-1` with `min-w-0` lets them shrink;
`max-w` caps them on desktop. Height stays fixed so the touch target never
shrinks with the width.

> This was a real bug caught in review. If you change the box sizing, redo the
> arithmetic — the brief specifies 320px for this page specifically.

---

## 9. Vendor Surfaces

**Route:** `/store/[store_id]/orders/[orderId]`

### The delivery link card

Sits **above** the status card, because sharing it is the action we most want
taken. Contains:

- **QR code first** — at handover the vendor and rider are standing together, so
  the rider scans off the screen and leaves. Copy-pasting a URL into WhatsApp is
  the fallback.
- The link with a copy button.
- **"Enter code instead"** — same visual weight as sharing, not hidden. A rider
  with no smartphone is common, and this is the path for them.
- **"Regenerate link"** — the answer to "the rider lost it". Kills the previous
  token and clears the attempt counter, so a lockout caused by one rider does
  not follow the vendor to the next.

Rendered client-side to a data URI, so the QR needs no network round trip on a
card often opened just before handover.

### Action hierarchy replaces the status dropdown

A `Select` presented "Processing" and "Delivered" as equivalent choices. They
are not: one of them decides whether the vendor is paid today or in three days,
and whether a dispute is winnable.

```
  1. Confirm delivery with code   primary, green
  2. Routine forward transition   outline
  3. Mark delivered without code  plain text link, behind a confirmation
  4. Terminal failure             destructive, visually separated
```

Option 3's confirmation states the cost plainly — payment stays in escrow, and a
dispute will find no proof. It must remain available (riders lose phones,
customers refuse codes) but must never look like the quick option.

### Header and sidebar

- **Header** — `Sub-order ORD-2026-XXXXX`, then `customer · N items · total ·
  placed <date>`. The "Awaiting code" badge shows **only while a code is
  genuinely outstanding**; a badge that lingers after delivery tells the vendor
  to chase something already done.
- **Customer information** — contact details as real `mailto:` / `tel:` links,
  plus "Message customer". The note *"Messages stay on Soraxi and are attached
  to this sub-order"* exists because a platform conversation is timestamped,
  immutable and admin-readable in a dispute; a phone call leaves nothing behind.
- **Financials** — subtotal, shipping, customer paid, platform fee with its
  **live percentage**, and the settlement figure as the largest thing on the
  card. The escrow notice adapts: in escrow / released / frozen on dispute /
  refunded. Vendors only believe the faster-payout promise if they can watch it
  happen.

---

## 10. Customer Surfaces

**Route:** `/orders/[slug]`

The per-store accordion was replaced by `SubOrderCard`. The accordion was built
when a sub-order was a passive record; each one can now be actively waiting on
the customer. Cards needing attention open expanded; settled ones collapse.

### The code block

Six digits, very large, tabular figures, split `482 917` — this gets read aloud
at a gate, and six digits in one run get misheard. Tap to copy.

**The second line is load-bearing:**

> *Giving this code confirms you received the items. You can still report a
> problem afterwards.*

This prevents the single most common stall in the whole flow. A customer who
believes handing over the code waives their rights refuses to give it, and the
delivery stalls at the door. **The code proves receipt, not satisfaction** —
condition, wrong-item and damage disputes remain fully available. That sentence
is on the card, not in terms, for exactly that reason.

### Three card states

| State | Shows |
|---|---|
| Awaiting code | Guidance, code block, "I've received these items" |
| Delivered + proven | Receipt: store, time, received by, method |
| Delivered + **no proof** | Amber "No proof" badge, warning, and *both* "Confirm I received this" and "Report a problem" |

The spent code is **withheld** once used — leaving a dead code on screen invites
someone to read it out for an unrelated delivery.

> **Bug fixed here:** store names rendered as `Store 1` / `Store 2`, a
> placeholder that had shipped. Real names now come from `storeSnapshot.name`.
> This matters more with proof of delivery: a customer holding two codes must
> know which rider gets which.

---

## 11. Admin: The Delivery Record

**Route:** `/admin/disputes/[disputeId]`

### Why it is a "record", not "proof"

⚠️ **Disputes are not all about non-delivery.** A customer may have received the
wrong item, a damaged one, or something not matching its description. The
platform has **no dispute categories** — `DisputeRecord.reason` is free text —
so this panel *cannot know* which kind of case it sits inside.

An over-confident presentation is therefore genuinely dangerous. A panel
shouting "STRONG PROOF — burden sits with the customer" on a damaged-goods case
invites a moderator to rule for the vendor on evidence that has nothing to do
with the complaint.

So the panel states facts, names precisely what they establish, and carries a
permanent scope note:

> This record answers **whether the parcel arrived**. It does not show what was
> inside it, whether it matched the listing, or what condition it was in. Weigh
> it only against claims about non-delivery.

Badges describe rather than adjudicate: *Recipient-attested*, *First-party*,
*Vendor's word only*, *No record*.

The empty-evidence state follows the same rule. It no longer says "a customer
who received nothing has nothing to photograph" — that also presumes
non-delivery. It now reads: *"Whether this matters depends on the claim."*

Neither secret is projected. An admin sees *that* delivery was attested and by
what route, never the code or the link.

---

## 12. Notifications

### Out-for-delivery email

`OutForDeliveryEmail` — the **only** template that may contain a delivery code,
and it goes to the customer alone. It must never be CC'd, forwarded to a vendor,
or reused for a vendor-facing notification.

Sent on the `Shipped` transition, and it **replaces** the generic status email
for that transition rather than arriving alongside it — two emails about the
same event, one of which buries the code, is how the code gets missed at the
gate. The plain-text fallback carries the code too; some clients strip HTML
entirely.

### Thread system notice

A code confirmation publishes `delivery.confirmed` through the messaging event
bus, and a handler appends *"Delivery confirmed — code entered by \<name\>."* to
the order's thread — if one exists (see the messaging doc, §7.1).

Published **after** the transaction commits and never throws, so a messaging
hiccup cannot fail a delivery that is already confirmed and paid out.

Only code confirmations are announced. A vendor's unproven declaration and a
customer's own in-app confirmation are already visible to whoever performed
them; a notice saying "you confirmed this" is noise.

---

## 13. Constants and Tunables

| Constant | Value | Location |
|---|---|---|
| `DELIVERY_CODE_LENGTH` | 6 | `constants/delivery.ts` |
| `MAX_DELIVERY_CODE_ATTEMPTS` | 3 | `constants/delivery.ts` |
| `DELIVERY_TOKEN_TTL_MS` | 48 h | `constants/delivery.ts` |
| Public submit rate limit | 10 / min per token | `server/delivery/procedures.ts` |
| `AUTO_CONFIRM_DAYS` | 3 (**unchanged**) | `order-auto-confirm.service.ts` |
| Order reference format | `ORD-{year}-{last 5 of _id}` | `lib/utils/order-number.ts` |

> `constants/delivery.ts` is deliberately free of any `server-only` import — the
> rider's code input and the vendor's dialog are client components and need the
> code length. Pulling it from the crypto module drags `server-only` into the
> client bundle and **breaks the entire build**, including tRPC, with a
> misleading 404. This happened once; keep logic out of that file.

---

## 14. File Inventory

```
src/constants/delivery.ts              client-safe constants (see warning above)
src/lib/utils/delivery-proof.ts        server-only: generation + constant-time verify
src/lib/utils/order-number.ts          formatOrderNumber()

src/lib/db/models/order.model.ts       IDeliveryProof + sparse token index

src/domain/orders/
  delivery-proof-projection.ts         the three audience allow-lists
  order.ts                             toJSON / toStoreJSON use them
  interfaces/order.interface.ts        deliveryProof omitted from shared type

src/services/orders/
  delivery-proof.service.ts            issue, resolve, confirm, declare
  suborder-settlement.service.ts       the ONE settlement implementation
  order.service.ts                     mints code+link on Shipped

src/modules/server/
  delivery/procedures.ts                       public: getByToken, submitCode
  store/store-orders/delivery-proof/procedures.ts  vendor: regenerate, confirm, declare

src/modules/delivery/                  rider page
  delivery-confirmation-page.tsx       7 states
  components/code-input.tsx            fluid 6-box input (shared with vendor dialog)

src/modules/store/orders/delivery/     vendor
  delivery-link-card.tsx               QR + link + regenerate + enter-code
  delivery-actions.tsx                 the action hierarchy
  status-stepper.tsx                   replaces the status dropdown
  vendor-code-dialog.tsx               phone-relayed code entry
  customer-information-card.tsx
  financials-card.tsx

src/modules/user/order/delivery/       customer
  sub-order-card.tsx                   replaces the accordion
  delivery-code-block.tsx              the code, and the anti-stall line
  delivery-receipt.tsx                 proven / unproven variants

src/modules/admin/disputes/
  delivery-record-panel.tsx            factual, scope-bounded

src/services/notifications/templates/
  out-for-delivery-email.tsx           the only template carrying a code

routes:
  src/app/d/[token]/page.tsx           public rider page
```

**Touched outside the feature:**

| File | Change |
|---|---|
| `src/enums/index.ts` | `DeliveryProofMethodEnum`, `DeliveryProofStrengthEnum`, `delivery_confirmed` message + outbox types |
| `journal-entry-writer.service.ts` | `DELIVERY_CODE` settlement trigger |
| `server/order/procedures.ts` | Customer confirm rewired to shared settlement; records `customer_in_app` |
| `store-orders/order-status-management/procedures.ts` | Publishes code email on Shipped |
| `server/admin/disputes/procedures.ts` | Exposes `deliveryRecord` + `subOrderReference` |
| `services/messaging/messaging-events.ts` | `deliveryConfirmed()` publisher |
| `handlers/append-system-message.handler.ts` | Consumes `delivery.confirmed` |
| `package.json` | Added `qrcode` |

---

## 15. How To Extend It

### Add a proof method (e.g. photo on delivery)

1. Add to `DeliveryProofMethodEnum`, placed by evidential strength.
2. Map it in `proofStrength()`.
3. Add labels in `delivery-record-panel.tsx` and `delivery-receipt.tsx`.
4. Decide whether it settles immediately — that is a **product** decision about
   how much the evidence is worth, not a technical one.

### Change the payout incentive

Everything lives in two places: `settleSuborder` is called by `confirmWithCode`
and **not** by `declareWithoutProof`. Do not add settlement to the declare path
without deciding what remains of the incentive.

### Lengthen the no-proof window

`AUTO_CONFIRM_DAYS` in `order-auto-confirm.service.ts`. If it should differ by
proof presence, branch inside `findEligibleSuborders` on
`subOrder.deliveryProof?.method`.

### Add SMS delivery of the code

There is no SMS provider on the platform. Adding one means a new vendor, cost,
and a second place a code can leak — treat the template rule in §12 as binding.

---

## 16. Testing and Verification

No automated suite yet (§17). Verification was done with throwaway scripts
against a dev server and the real database, each restoring what it touched —
including on the crash path.

**61 end-to-end checks passing** across four suites:

| Suite | Checks | Notable assertions |
|---|:---:|---|
| Rider | 18 | Payload leaks no code/email/phone; **failed attempt survives transaction rollback**; correct code settles; token retired; replay refused |
| Vendor | 14 | Cross-store access `FORBIDDEN`; regenerate kills the old link; code entry settles; **declare-without-proof leaves money `pending`** |
| Customer | 14 | Code present / token withheld; spent code withheld; no-proof state warns and offers recourse; real store names |
| Admin + notice | 15 | Record absent before, present after; **admin payload has neither code nor token**; `delivery.confirmed` drains to a thread notice |

**Leak checks were run at the wire**, not just in types — seeding known secrets
and inspecting real HTTP payloads:

| | code | token |
|---|---|---|
| Vendor endpoint | **absent** ✓ | present ✓ |
| Customer endpoint | present ✓ | **absent** ✓ |
| Admin endpoint | **absent** ✓ | **absent** ✓ |

Typecheck and production build clean; `/d/[token]` registered as a dynamic route.

**Not verified:** visual rendering. No browser automation is installed, so the
320/360px layout and dark mode are verified by construction and class audit, not
by eye.

### Gotchas when testing locally

- **First compile of a route can exceed 4 minutes** on a cold `.next`; it is
  ~0.4s once warm. This looks like a hang and is not.
- **The vendor order page renders client-side** (no server prefetch), so `curl`
  returns only a skeleton. Verify its data contract via the tRPC endpoint
  instead.
- **PowerShell's `Invoke-WebRequest` strips a manual `Cookie` header** — it
  manages cookies through `-WebSession`. Use `curl` for authenticated fetches.
- **A killed build can leave `.next/dev/types/routes.d.ts` truncated**, which
  makes `tsc` report syntax errors that look like your code. Delete
  `.next/dev/types`.
- **Never restore test data with `replaceOne` + a JSON round-trip** — it
  stringifies ObjectIds and Mongo rejects the write, leaving real money moved
  and nothing reverted. Use field-targeted `$set`/`$unset`.
- Ledger lines key off **`journalId`**, not `journalEntryId`. Deleting journal
  entries alone leaves orphaned lines.

---

## 17. Known Gaps and Future Work

| Gap | Notes |
|---|---|
| **No automated tests** | Highest-value follow-up. `delivery-proof.ts` (pure) and the attempt/lockout cycle are the obvious first targets. |
| **Codes stored in plaintext** | Justified in §5.3. KMS encryption at rest is the hardening path if this becomes a concern. |
| **No-proof still auto-releases in 3 days** | Deliberate (§7.4). One constant to change. |
| **No withdrawal hold** | Deliberate (§7.4). A dispute after payout may find nothing to freeze. |
| **No dispute categories** | The root reason §11 must stay neutral. Adding a category enum would let the panel state relevance precisely instead of hedging. |
| **No geolocation capture** | Explicitly cut from v1. |
| **No photo-on-delivery** | A weaker fallback tier if riders can't get codes; not built. |
| **Rider name is unverified** | A record, not evidence. Stated as such in the admin panel. |
| **RSC serialization warnings** | The customer order route logs "Only plain objects can be passed to Client Components" for ObjectIds. Pre-existing, non-fatal, but noisy enough to mask a real error. |
| **ESLint broken repo-wide** | `Converting circular structure to JSON` from the eslintrc bridge; fails on untouched files. Nothing in this repo is currently linted. |

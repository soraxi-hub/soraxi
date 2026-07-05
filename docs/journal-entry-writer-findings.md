# JournalEntryWriter Review — Findings & Staging Tests

**Context:** Found while wiring `reconciliation.util.ts`'s functions against the
actual `JournalEntryWriter` source. Two categories: bugs fixed directly in the
reconciliation utilities, and suspected issues in `JournalEntryWriter` itself
that need a staging test to confirm before they're touched.

---

## 1. Fixed in `reconciliation.util.ts` (high confidence)

These were wrong assumptions baked into the reconciliation functions before
`JournalEntryWriter` was available for review. All three are already
corrected in the current version of the file.

### 1.1 `reconcileVendorDebt` was reading an account that always nets to zero

The function derived outstanding vendor debt from `DEBT_RECOVERY_CLEARING`.
But `writeDebtRecovery` debits and credits that account the _same amount
within the same call_:

```
DEBIT   DEBT_RECOVERY_CLEARING   recoveredAmount
CREDIT  VENDOR_AVAILABLE         recoveredAmount
DEBIT   PLATFORM_REVENUE_PENALTIES   recoveredAmount
CREDIT  DEBT_RECOVERY_CLEARING       recoveredAmount
```

Net effect on `DEBT_RECOVERY_CLEARING`, system-wide, is always zero. The
original function would have returned `derived: 0` for every vendor, every
time — a permanently broken check.

**Fix:** debt is implicitly represented as a _negative `VENDOR_AVAILABLE`
ledger balance_. `writeDisputeUpheld`'s penalty line debits the vendor's
full `penaltyAmount` out of `VENDOR_AVAILABLE` even when the balance can't
cover it — that's what pushes it negative — and `applyDisputeUpheldDeductions`
(`vendor-wallet.model.ts`) records `Math.abs(newAvailable)` as `debt.amount`
at exactly that moment. So:

```
derived debt = max(0, -deriveLedgerAccountBalance(VENDOR_AVAILABLE, { entityId }))
```

This fix's correctness depends on §2.1 below being resolved in `Vendors`'
favor (i.e. that `VENDOR_AVAILABLE`'s direction is what this assumes).

### 1.2 `checkEscrowSolvency` had the wrong sign convention and the wrong account set

Two separate problems:

- **Sign convention.** `PLATFORM_ESCROW` and `PAYOUT_PROCESSING` are
  asset-style accounts — `writePaymentReceived`'s own comment confirms it:
  _"The DEBIT on PLATFORM_ESCROW records that the platform is now holding
  the funds."_ Debit increases, credit decreases. The original function used
  the same `credit − debit` formula as the liability-style `VENDOR_*`
  accounts, which is backwards for these two.
- **Account set.** `writeOrderSettlement` never touches `PLATFORM_ESCROW` —
  settlement is a pure internal reclassification (the `CUSTOMER_REFUND_PAYABLE`
  liability closes, `VENDOR_PENDING` + commission open), not a cash movement.
  Escrow only moves on payment received, fees, confirmed refunds, and
  completed payouts.

**Fix:** `deriveLedgerAccountBalance` now takes an `increasesOn: "debit" |
"credit"` option. `checkEscrowSolvency` sums `PLATFORM_ESCROW +
PAYOUT_PROCESSING` (both asset-convention) as "total cash the platform still
controls," and compares against `VENDOR_PENDING + VENDOR_AVAILABLE +
VENDOR_DISPUTED + CUSTOMER_REFUND_PAYABLE` (liability-convention) as "total
still owed." Depends on §2.2 below for full confidence.

### 1.3 `reconcileTransactionRecord` was pulling in the wrong journal entries

It matched on `referenceType: SUBORDER` alone. But `writeFundsReleased`
_also_ uses `referenceType: SUBORDER` with the same `suborderId` when
delivery is later confirmed — so a suborder that had progressed past
settlement would have its release entry's lines pulled in alongside the
settlement entry's, double-counting.

**Fix:** scoped the query to `category: VENDOR_SETTLEMENT` specifically —
the entry `writeOrderSettlement` writes, which is what
`TransactionRecord.suborderBreakdowns` actually reflects. This also let the
function drop `VENDOR_AVAILABLE` from its query entirely (settlement only
ever credits `VENDOR_PENDING`), sidestepping the unresolved question in
§2.1.

---

## 2. Suspected issues in `JournalEntryWriter` (needs a staging test — not yet changed)

These are reasoned from reading the code and comments, not from running it.
**Do not treat these as confirmed bugs** — confirm with the tests in §3
before touching `JournalEntryWriter`.

### 2.1 `VENDOR_AVAILABLE`'s debit/credit direction looks inconsistent across composer methods

Traced all nine places `VENDOR_AVAILABLE` is touched. They split into two
internally-consistent-but-mutually-contradictory groups:

**Group A — consistent with "DEBIT increases `VENDOR_AVAILABLE`":**

| Method                       | Line                      | Stated/implied intent             |
| ---------------------------- | ------------------------- | --------------------------------- |
| `writeDisputeRejected`       | `DEBIT VENDOR_AVAILABLE`  | increase (funds returned)         |
| `writePayoutFailed`          | `DEBIT VENDOR_AVAILABLE`  | increase (payout reversed)        |
| `writeFundsReleased`         | `DEBIT VENDOR_AVAILABLE`  | increase (pending → available)    |
| `writeDisputeOpened`         | `CREDIT VENDOR_AVAILABLE` | decrease (funds frozen)           |
| `writePayoutInitiated`       | `CREDIT VENDOR_AVAILABLE` | decrease (moving to processing)   |
| `writeDebtRecovery` (pair 1) | `CREDIT VENDOR_AVAILABLE` | decrease ("withhold from vendor") |

**Group B — consistent with "CREDIT increases `VENDOR_AVAILABLE`"** (the
convention documented in `reconciliation.util.ts`'s original comment table
for `reconcileVendorWallet`):

| Method                              | Line                      | Stated/implied intent       |
| ----------------------------------- | ------------------------- | --------------------------- |
| `writeDisputeUpheld` (penalty line) | `DEBIT VENDOR_AVAILABLE`  | decrease (penalty deducted) |
| `writePayoutProcessingFee`          | `DEBIT VENDOR_AVAILABLE`  | decrease (fee deducted)     |
| `writePayoutProcessingFeeReversal`  | `CREDIT VENDOR_AVAILABLE` | increase (fee reversed)     |

Six methods agree with each other; three agree with each other but disagree
with the six. Both groups are internally self-consistent (each pair of
opposite-effect methods, e.g. `writeDisputeOpened`/`writeDisputeRejected`,
are exact reverses of one another) — so this isn't random noise, it's a
genuine two-camp split.

**Why this matters more than it might look:** the three Group B methods are
exactly the ones that create and reverse _vendor debt_ (the penalty line in
`writeDisputeUpheld` is what pushes `VENDOR_AVAILABLE` negative in the first
place). If Group B has the direction backwards, `reconcileVendorDebt`
(§1.1) will show real drift the moment a penalty is applied.

**Why `checkGlobalBalance` / `verifyJournalEntryIntegrity` won't catch this
either way:** both only verify that credits equal debits _within_ an entry
(`assertBalanced` guarantees that by construction). A line crediting the
wrong account is still a balanced entry — this class of bug is invisible to
every check except `reconcileVendorWallet`, which cross-references the
ledger against the independently-computed `VendorWallet` document.

**For context, VENDOR_PENDING does not have this problem** — three
independent methods (`writeOrderSettlement`, `writeOrderCancellationRefund`,
`writeFailedDeliveryRefund`) all agree with each other and with
`reconciliation.util.ts`'s documented convention (CREDIT increases). No
action needed there.

### 2.2 `writePayoutCompleted`'s `PLATFORM_ESCROW` direction may be inverted

`writePaymentReceived`'s comment states plainly: _"The DEBIT on
PLATFORM_ESCROW records that the platform is now holding the funds"_ — debit
increases escrow. `writeCollectionFee`, `writeGatewayFee`, and
`writeRefundConfirmed` are all consistent with this (they `CREDIT`
`PLATFORM_ESCROW` on money leaving, i.e. credit decreases it).

`writePayoutCompleted` also `DEBIT`s `PLATFORM_ESCROW` — but its own comment
describes this as _"funds exit the platform."_ Same debit direction, opposite
stated effect, on the same account, in the same file.

Working through the accounting: if `PLATFORM_ESCROW` is debit-increase (as
`writePaymentReceived` states), then `writePayoutCompleted` debiting it means
escrow **goes up** every time a vendor is paid out — the opposite of the
real-world effect (cash leaving the platform's bank account to reach the
vendor). If this is real, it would silently inflate the derived escrow
balance by `netAmount` on every completed payout, cumulatively, forever.

### 2.3 What this means for `checkEscrowSolvency` and `reconcileVendorDebt` in practice

Until §2.1 and §2.2 are confirmed one way or the other:

- `checkEscrowSolvency`'s `delta` may show a **growing, spurious shortfall
  or surplus that tracks your completed-payout volume** (from §2.2) —
  that pattern, if seen, points at `writePayoutCompleted`, not a real
  solvency problem.
- `reconcileVendorDebt`'s `derived` figure is only as trustworthy as §2.1's
  resolution — if Group B is backwards, real debt events will show up as
  discrepancies here, which is actually the intended purpose of the check
  (it would be doing its job) — but it's worth knowing _why_ before treating
  every flagged vendor as a genuine drift incident.

---

## 3. Recommended staging tests

Both tests below are read-only from the reconciliation utilities'
perspective — they just need a seeded scenario run once in staging, then a
comparison of `reconcileVendorWallet` / `reconcileVendorDebt` output against
the real `VendorWallet` document.

### Test A — resolves §2.1 (VENDOR_AVAILABLE direction)

1. Seed a vendor with a known `VENDOR_AVAILABLE` balance (e.g. via a
   settled order + funds release, so the wallet shows a clean starting
   `available` figure).
2. Open a dispute on a suborder for that vendor (`writeDisputeOpened`).
3. Reject the dispute (`writeDisputeRejected`) — funds should return to
   `available`, ending where it started.
4. Compare `reconcileVendorWallet(vendorId)`'s `derived.available` against
   the actual `VendorWallet.balances.available`. They should match — this
   alone confirms whether Group A or Group B is correct for the
   open/reject pair.
5. Repeat with a fresh dispute, this time **uphold** it with a penalty
   larger than the vendor's current `available` balance (forcing a debt).
   Compare:
   - `VendorWallet.balances.available` (should go negative, per
     `applyDisputeUpheldDeductions`)
   - `VendorWallet.debt.amount` (should equal the shortfall)
   - `reconcileVendorWallet(vendorId).derived.available` (from the ledger)
   - `reconcileVendorDebt(vendorId).derived` (from the ledger, via §1.1's fix)

   If steps 2–4 confirm Group A (debit increases) but the penalty line in
   step 5 is Group B, `reconcileVendorWallet` and `reconcileVendorDebt` will
   show a mismatch precisely at this step — confirming the penalty line in
   `writeDisputeUpheld` has the direction backwards. If everything matches,
   §2.1 is resolved in Group B's favor instead, and `reconciliation.util.ts`
   needs `increasesOn` flags added consistently for `VENDOR_AVAILABLE`
   (mirroring the `checkEscrowSolvency` fix).

### Test B — resolves §2.2 (PLATFORM_ESCROW direction in writePayoutCompleted)

1. Note `checkEscrowSolvency()`'s `escrowBalance` before any payout.
2. Run a vendor payout end-to-end through to `PayoutStatus.COMPLETED`
   (`writePayoutInitiated` → `writePayoutCompleted`).
3. Note `checkEscrowSolvency()`'s `escrowBalance` after.
4. Real-world expectation: `escrowBalance` should **decrease** by the
   payout's `netAmount` (cash left the platform for the vendor's bank
   account).
   - If it _increases_ instead, `writePayoutCompleted`'s `PLATFORM_ESCROW`
     line direction is confirmed backwards — it should be `CREDIT`, not
     `DEBIT` (with `PAYOUT_PROCESSING` and `GATEWAY_FEES_EXPENSE` lines
     re-balanced accordingly).
   - If it decreases correctly, the comment in `writePaymentReceived` and
     the actual asset-convention behavior established elsewhere doesn't
     apply cleanly to this account the way §2.2 assumed — worth a second
     look at why the two comments read as contradictory.

---

## 4. Action items

- [ ] Run Test A in staging; resolve §2.1
- [ ] Run Test B in staging; resolve §2.2
- [ ] If §2.1 resolves to Group B, update `reconciliation.util.ts`'s
      `VENDOR_AVAILABLE` derivations (`reconcileVendorWallet`,
      `reconcileVendorDebt`, `checkEscrowSolvency`) to pass
      `increasesOn: "credit"` consistently, and fix the Group A methods in
      `JournalEntryWriter` (or vice versa if it resolves to Group A)
- [ ] If §2.2 confirms the inversion, fix `writePayoutCompleted`'s
      `PLATFORM_ESCROW` line and re-verify `checkEscrowSolvency` against a
      fresh payout
- [ ] Re-run `reconcileVendorWallet` and `reconcileVendorDebt` against any
      vendors with historical dispute/payout activity once the above are
      fixed, to catch any real drift that accumulated while the direction
      was wrong

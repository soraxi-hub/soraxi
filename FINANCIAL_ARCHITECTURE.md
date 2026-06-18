# Soraxi Financial System — Architecture Documentation

> **Platform:** Soraxi Marketplace
> **Last Updated:** June 2026
> **Audience:** Internal developers and new team members
> **Status:** Living document — update as the system evolves

---

## Table of Contents

1. [Overview](#1-overview)
2. [Business Context](#2-business-context)
3. [Core Principles](#3-core-principles)
4. [Core Components](#4-core-components)
5. [Double-Entry Accounting System](#5-double-entry-accounting-system)
6. [Chart of Accounts](#6-chart-of-accounts)
7. [Data Models](#7-data-models)
8. [Commission Structure](#8-commission-structure)
9. [Payout Fee Structure](#9-payout-fee-structure)
10. [Fund Flow Logic](#10-fund-flow-logic)
11. [Fund Flow Diagram](#11-fund-flow-diagram)
12. [Dispute Policy](#12-dispute-policy)
13. [Payout System](#13-payout-system)
14. [Reconciliation](#14-reconciliation)
15. [Open Items & Future Considerations](#15-open-items--future-considerations)

---

## 1. Overview

Soraxi is a marketplace for students and vendors within Nigerian tertiary institutions. The financial system manages the complete lifecycle of money from the moment a student makes a payment to the moment a vendor receives their earnings in their bank account.

**Stack:**

- **Backend/Frontend:** Next.js (App Router)
- **Database:** MongoDB via Mongoose
- **Payment Gateway:** Flutterwave
- **Deployment:** Vercel

All monetary values are stored and processed in **Kobo** (1 Naira = 100 Kobo) to avoid floating-point precision errors. Amounts are always positive integers — fractional Kobo values are never valid.

---

## 2. Business Context

### Revenue Model

- **Primary:** Commission per vendor sale (tiered percentage + flat fee — see §8)
- **Secondary:** Penalty revenue from upheld disputes
- **Planned:** Subscription model for vendors (future)

### Fund Flow Direction

Students pay the platform first. The platform holds the funds in escrow, deducts its commission, and disburses the remainder to the vendor after order confirmation.

### Order Structure

- A single **Order** can contain multiple **Suborders**, each belonging to a different vendor/store
- Financial operations always occur at the **suborder level**, never at the main order level
- This ensures vendor A's payout is never blocked by vendor B's activity

### Fulfillment Model

The platform operates a hybrid fulfillment model:

- **Vendor-fulfilled:** Vendor manages and delivers the order independently and updates the order status
- **Platform-fulfilled:** Platform manages delivery on the vendor's behalf

---

## 3. Core Principles

These principles govern every design decision in the financial system.

1. **Double-Entry Ledger as Source of Truth** — Every financial event is recorded as a balanced journal entry. Every journal entry has two or more ledger lines where the sum of credits always equals the sum of debits. No balance is changed without a corresponding balanced entry in the ledger.

2. **Wallets are Cached Views** — Wallet documents (vendor, platform) are fast-read caches that mirror the ledger. The ledger is always authoritative. Wallet discrepancies are detected by the reconciliation system.

3. **Single Write Path** — `JournalEntryWriter` is the only class permitted to write `JournalEntry` and `LedgerLine` documents. No service, route, or repository writes to these collections directly. This guarantees the double-entry invariant is enforced on every write.

4. **Suborder-Level Granularity** — All financial operations (settlement, disputes, freezing, payouts) are scoped to the suborder, not the order.

5. **Kobo-First Arithmetic** — All amounts are stored and calculated in Kobo. The `assertValidKoboAmount` guard in `JournalEntryWriter` throws on any non-positive-integer amount before a write is attempted.

6. **Explicit State Transitions** — Every financial state (pending, available, disputed) has a defined entry and exit condition. No implicit transitions.

7. **Student-First Protection** — In ambiguous or unresolved scenarios (e.g. auto-resolution), the default outcome protects the student.

8. **Session-Guarded Writes** — Every write that touches more than one document uses a MongoDB `ClientSession` (transaction). Journal entry + ledger lines are always written atomically.

9. **Immutability** — Journal entries and ledger lines are never updated or deleted after creation. Reversals are recorded as new entries, not modifications.

---

## 4. Core Components

### 1. The Journal Entry

The atomic unit of a financial event. Groups two or more ledger lines that together represent one balanced event. Immutable after creation.

### 2. The Ledger Line

One side of a journal entry. Records which account is affected, in which direction, and by how much. The sum of all credit lines within a journal entry must equal the sum of all debit lines. Immutable after creation.

### 3. The JournalEntryWriter

The sole authorised writer of journal entries and ledger lines. Enforces the double-entry invariant before every DB write. All financial event recording flows through this class.

### 4. The Vendor Wallet

Tracks a vendor's running balance across four states: available, pending, disputed, and debt. Not a real bank account — a cached state maintained for fast balance reads. Reconciled against the ledger periodically.

### 5. The Platform Wallet

A singleton document tracking the platform's accumulated revenue from commissions and penalties. Also a cache — the ledger is authoritative.

### 6. The Transaction Record

The bridge between Flutterwave and the internal system. Links an external payment reference to the internal suborder breakdowns and commission calculations.

### 7. The Payout System

Moves money from the platform to a vendor's real bank account via Flutterwave's Transfer API. Every payout attempt — initiated, completed, or failed — is fully logged with journal entries.

---

## 5. Double-Entry Accounting System

### How It Works

Every financial event produces one `JournalEntry` document and two or more `LedgerLine` documents, all written atomically in the same MongoDB transaction.

```
JournalEntry          LedgerLine (DEBIT)
    │                      │
    └──── journalId ───────┤
                           │
                      LedgerLine (CREDIT)
```

The `JournalEntryWriter` service:

1. Validates all amounts are positive Kobo integers
2. Constructs the ledger lines for the event
3. Asserts `sum(credits) === sum(debits)` — throws before any DB write if this fails
4. Writes the `JournalEntry` header document first
5. Bulk-inserts all `LedgerLine` documents in the same session

### Journal Entry Map

The canonical definition of which accounts move for each financial event:

| Event                              | Debit                                                  | Credit                                                       |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **PAYMENT_RECEIVED**               | `PLATFORM_ESCROW` (gross)                              | `CUSTOMER_REFUND_PAYABLE` (gross)                            |
| **ORDER_SETTLED**                  | `CUSTOMER_REFUND_PAYABLE` (gross)                      | `VENDOR_PENDING` × n vendors + `PLATFORM_REVENUE_COMMISSION` |
| **FUNDS_RELEASED**                 | `VENDOR_AVAILABLE` (settle)                            | `VENDOR_PENDING` (settle)                                    |
| **DISPUTE_OPENED**                 | `VENDOR_DISPUTED` (settle)                             | `VENDOR_AVAILABLE` (settle)                                  |
| **DISPUTE_REJECTED**               | `VENDOR_AVAILABLE` (settle)                            | `VENDOR_DISPUTED` (settle)                                   |
| **DISPUTE_UPHELD** (pair 1)        | `VENDOR_DISPUTED` (settle)                             | `CUSTOMER_REFUND_PAYABLE` (settle)                           |
| **DISPUTE_UPHELD** (pair 2)        | `VENDOR_AVAILABLE` (penalty)                           | `PLATFORM_REVENUE_PENALTIES` (penalty)                       |
| **DISPUTE_AUTO_RESOLVED**          | `VENDOR_DISPUTED` (settle)                             | `CUSTOMER_REFUND_PAYABLE` (settle)                           |
| **DEBT_RECOVERY** (pair 1)         | `DEBT_RECOVERY_CLEARING` (amount)                      | `VENDOR_AVAILABLE` (amount)                                  |
| **DEBT_RECOVERY** (pair 2)         | `PLATFORM_REVENUE_PENALTIES` (amount)                  | `DEBT_RECOVERY_CLEARING` (amount)                            |
| **PAYOUT_PROCESSING_FEE**          | `VENDOR_AVAILABLE` (fee)                               | `PLATFORM_REVENUE_COMMISSION` (fee)                          |
| **PAYOUT_INITIATED**               | `PAYOUT_PROCESSING` (net)                              | `VENDOR_AVAILABLE` (net)                                     |
| **PAYOUT_COMPLETED**               | `PLATFORM_ESCROW` (net) + `GATEWAY_FEES_EXPENSE` (fee) | `PAYOUT_PROCESSING` (net + fee)                              |
| **PAYOUT_FAILED**                  | `VENDOR_AVAILABLE` (net)                               | `PAYOUT_PROCESSING` (net)                                    |
| **PAYOUT_PROCESSING_FEE_REVERSAL** | `PLATFORM_REVENUE_COMMISSION` (fee)                    | `VENDOR_AVAILABLE` (fee)                                     |
| **GATEWAY_FEE**                    | `GATEWAY_FEES_EXPENSE` (fee)                           | `PLATFORM_ESCROW` (fee)                                      |
| **GATEWAY_FEE_REVERSAL**           | `PLATFORM_ESCROW` (fee)                                | `GATEWAY_FEES_EXPENSE` (fee)                                 |

> **DISPUTE_UPHELD** produces four lines sharing one `journalId` (two balanced pairs). `DEBT_RECOVERY` also produces four lines sharing one `journalId`. In both cases the invariant check verifies total credits === total debits across all lines before any write.

### Writer Methods

| Method                             | Event                                                    |
| ---------------------------------- | -------------------------------------------------------- |
| `writePaymentReceived`             | Student payment enters escrow                            |
| `writeOrderSettlement`             | Escrow split to vendors + platform on order confirmation |
| `writeFundsReleased`               | Pending → available on delivery confirmation             |
| `writeDisputeOpened`               | Available → disputed on dispute open                     |
| `writeDisputeRejected`             | Disputed → available on rejection                        |
| `writeDisputeUpheld`               | Refund + penalty on upheld dispute                       |
| `writeDisputeAutoResolved`         | Refund only on system auto-resolution (no penalty)       |
| `writeDebtRecovery`                | Debt withheld from payout via clearing account           |
| `writePayoutProcessingFee`         | Soraxi processing fee deducted from payout               |
| `writePayoutInitiated`             | Net amount enters PAYOUT_PROCESSING                      |
| `writePayoutCompleted`             | Processing account closed, escrow reduced                |
| `writePayoutFailed`                | Processing account reversed to vendor available          |
| `writePayoutProcessingFeeReversal` | Processing fee returned on payout failure                |
| `writeGatewayFee`                  | Flutterwave fee recorded as platform expense             |
| `writeGatewayFeeReversal`          | Gateway fee reversed on payout failure                   |

---

## 6. Chart of Accounts

These are the logical accounts in Soraxi's double-entry system. Every ledger line references exactly one account type.

| Account                       | Type      | Description                                                        |
| ----------------------------- | --------- | ------------------------------------------------------------------ |
| `PLATFORM_ESCROW`             | Asset     | Money held on behalf of customers/vendors for in-flight orders     |
| `VENDOR_PENDING`              | Liability | Vendor funds awaiting order confirmation                           |
| `VENDOR_AVAILABLE`            | Liability | Vendor funds cleared and ready to withdraw                         |
| `VENDOR_DISPUTED`             | Liability | Vendor funds frozen due to an open dispute                         |
| `PLATFORM_REVENUE_COMMISSION` | Revenue   | Commission income earned from sales                                |
| `PLATFORM_REVENUE_PENALTIES`  | Revenue   | Penalty income earned from upheld disputes + debt recovery         |
| `CUSTOMER_REFUND_PAYABLE`     | Liability | Amount owed back to a customer after a refund                      |
| `PAYOUT_PROCESSING`           | Asset     | Funds in-flight to a vendor's bank account via Flutterwave         |
| `GATEWAY_FEES_EXPENSE`        | Expense   | Flutterwave transfer fees recorded as a platform expense           |
| `DEBT_RECOVERY_CLEARING`      | Clearing  | Intermediate account used when recovering vendor debt from payouts |

---

## 7. Data Models

### JournalEntry

```typescript
{
  _id: ObjectId,
  category: LedgerEntryCategory,    // The financial event type
  referenceType: LedgerReferenceType, // "SUBORDER", "DISPUTE", "PAYOUT", "PENALTY"
  referenceId: ObjectId,             // _id of the triggering document
  description: string,
  metadata?: Record<string, unknown>,
  createdAt: Date                    // Immutable — no updatedAt
}
```

**Indexes:** `{ referenceId, referenceType }` compound, `category`

---

### LedgerLine

```typescript
{
  _id: ObjectId,
  journalId: ObjectId,           // Foreign key to JournalEntry
  type: "credit" | "debit",
  accountType: LedgerAccountType, // Which account in the chart of accounts
  entityId?: ObjectId,           // Only for VENDOR_* and CUSTOMER_* lines
  entityType?: "vendor" | "customer", // Only when entityId is set
  amount: number,                // In Kobo — always a positive integer ≥ 1
  createdAt: Date                // Immutable — no updatedAt
}
```

**Indexes:** `journalId`, `accountType`, `entityId` (sparse), `{ entityId, accountType, createdAt }` compound

---

### Vendor Wallet

```typescript
{
  _id: ObjectId,
  vendorId: ObjectId,
  balances: {
    available: number,  // Funds vendor can withdraw right now (Kobo)
    pending: number,    // Funds awaiting order confirmation (Kobo)
    disputed: number,   // Funds frozen due to open disputes (Kobo)
    total: number       // available + pending + disputed (Kobo)
  },
  debt: {
    amount: number,              // Amount owed to platform (Kobo)
    recoveryType: string,        // "PERCENTAGE_DEDUCTION" or "FULL_BLOCK"
    recoveryPercentage: number   // Only applicable if PERCENTAGE_DEDUCTION
  },
  currency: "NGN",
  createdAt: Date,
  updatedAt: Date
}
```

> **Note:** Balances are maintained as a running state updated alongside journal entries. The ledger is always authoritative — wallet discrepancies are detected by `reconcileVendorWallet`.

---

### Platform Wallet

```typescript
{
  _id: ObjectId,
  balances: {
    commission: number,  // Revenue from commissions + payout processing fees (Kobo)
    penalties: number,   // Revenue from vendor penalties + debt recovery (Kobo)
    total: number        // commission + penalties (Kobo)
  },
  currency: "NGN",
  createdAt: Date,
  updatedAt: Date
}
```

> **Note:** Singleton document — there is only ever one platform wallet. Does not store gateway fees or operational expenses; those are tracked via ledger only (`GATEWAY_FEES_EXPENSE` account).

---

### Transaction Record

```typescript
{
  _id: ObjectId,
  customerId: ObjectId,
  orderId: ObjectId,
  flutterwaveReference: string,
  flutterwaveStatus: string,     // "pending" | "successful" | "failed"
  totalAmount: number,           // Total amount paid by student (Kobo)
  suborderBreakdowns: [
    {
      suborderId: ObjectId,
      vendorId: ObjectId,
      grossAmount: number,       // What student paid for this suborder (Kobo)
      commission: number,        // Platform's cut (Kobo)
      settleAmount: number,      // Vendor's net amount (Kobo)
      commissionDetails: {
        percentageFee: number,
        flatFeeApplied: number
      },
      status: SuborderFinancialStatus
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Suborder Financial Statuses:**

| Status     | Meaning                                       |
| ---------- | --------------------------------------------- |
| `PENDING`  | Payment received, awaiting order confirmation |
| `DISPUTED` | Active dispute in progress                    |
| `SETTLED`  | Funds released to vendor's available balance  |
| `REFUNDED` | Student has been refunded                     |

---

### Payout Record

```typescript
{
  _id: ObjectId,
  vendorId: ObjectId,
  amountBreakdown: {
    requestedAmount: number,            // Full amount requested by vendor (Kobo)
    debtRecoveryDeductionAmount: number, // Amount withheld for debt recovery (Kobo)
    debtBeforeRecovery?: number,
    debtAfterRecovery?: number,
    debtRecoveryPercentage?: number,
    fixedProcessingFee: number,
    percentageProcessingFee: number,
    processingFee: number,              // fixedFee + percentageFee (Kobo)
    gatewayFee?: number,                // Flutterwave transfer fee (Kobo)
    netAmount: number                   // Final transfer amount to vendor (Kobo)
  },
  bankDetails: {                        // Snapshot at time of request
    bankCode: string,
    accountNumber: string,
    accountName: string
  },
  flutterwaveTransferId?: string,
  flutterwaveStatus?: string,
  status: "INITIATED" | "PROCESSING" | "COMPLETED" | "FAILED",
  failureReason?: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

### Dispute Record

```typescript
{
  _id: ObjectId,
  suborderId: ObjectId,
  orderId: ObjectId,
  customerId: ObjectId,
  vendorId: ObjectId,
  reason: string,                       // Student's written description
  evidence: string[],                   // Array of Cloudinary image URLs
  status: "OPEN" | "AWAITING_EVIDENCE" | "RESOLVED" | "AUTO_RESOLVED",
  outcome?: "UPHELD" | "REJECTED" | "INCONCLUSIVE",
  frozenAmount: number,                 // settle amount frozen at dispute open (Kobo)
  penaltyAmount: number,                // 0 unless upheld
  openedAt: Date,
  deadline: Date,                       // openedAt + 5 business days
  warningIssuedAt?: Date,               // When day 4 alert was sent to team
  resolvedAt?: Date,
  resolvedBy?: "PLATFORM_TEAM" | "SYSTEM",
  resolutionNotes?: string,
  additionalEvidenceRequestedAt?: Date,
  additionalEvidenceDeadline?: Date,    // + 48 hours
  additionalEvidence?: string[],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 8. Commission Structure

Commission is calculated per suborder using a tiered structure. All values are in Kobo.

| Transaction Range | Commission         |
| ----------------- | ------------------ |
| ₦1 – ₦2,499       | 5% + ₦100 flat fee |
| ₦2,500 – ₦4,999   | 5% only            |
| ₦5,000 and above  | 5% + ₦200 flat fee |

The `calculateCommission(amountInKobo)` utility returns:

- `commission` — total amount deducted
- `settleAmount` — vendor's net amount after deduction
- `details.percentageFee` — the raw 5% portion
- `details.flatFeeApplied` — the flat fee applied (0, ₦100, or ₦200 in Kobo)

> **Location:** `lib/utils/calculate-commission.ts`

---

## 9. Payout Fee Structure

Three separate deductions apply when a vendor requests a payout, applied in this order:

### Step 1 — Debt Recovery (if applicable)

```
calculateDebtRecoveryDeduction(requestedAmount, outstandingDebt, recoveryType)
→ recoveryDeduction
→ afterDebtAmount = requestedAmount - recoveryDeduction
```

Debt recovery is withheld first, before fees are calculated.

### Step 2 — Processing Fee (Soraxi revenue)

```
calculateWithdrawalFees(afterDebtAmount)
→ fixedFee + percentageFee = totalFee
→ afterProcessingFeeAmount = afterDebtAmount - totalFee
```

Processing fee is Soraxi's own revenue for handling the withdrawal.

### Step 3 — Gateway Fee (Flutterwave expense)

| Transfer Amount  | Fee  |
| ---------------- | ---- |
| ≤ ₦5,000         | ₦10  |
| ₦5,001 – ₦50,000 | ₦25  |
| > ₦50,000        | ₦50  |
| + VAT            | 7.5% |

```
calculateGatewayFee(afterProcessingFeeAmount)
→ gatewayFee
```

The gateway fee is a **platform expense** — it is NOT deducted from the vendor's transfer. The platform pays it separately. It is recorded in the ledger as `GATEWAY_FEES_EXPENSE`.

### Concrete Example

```
Requested:        ₦100,000
Debt Recovery:  −  ₦10,000   → recoveryDeduction
Processing Fee: −   ₦1,000   → platform revenue
Net Transfer:      ₦89,000   → sent to Flutterwave
Gateway Fee:    −     ₦53.75 → platform expense (not from vendor)

Vendor wallet deducted: ₦100,000 (full requested amount)
Platform earns:         ₦11,000 (₦10,000 debt recovery + ₦1,000 processing fee)
Platform pays:              ₦53.75 gateway fee
```

### How This Maps to Journal Entries

```
writeDebtRecovery(₦10,000)          → VENDOR_AVAILABLE out, PLATFORM_REVENUE_PENALTIES in
writePayoutProcessingFee(₦1,000)    → VENDOR_AVAILABLE out, PLATFORM_REVENUE_COMMISSION in
writePayoutInitiated(₦89,000)       → VENDOR_AVAILABLE out, PAYOUT_PROCESSING in
writeGatewayFee(₦53.75)             → GATEWAY_FEES_EXPENSE out, PLATFORM_ESCROW out

Total VENDOR_AVAILABLE reduction: ₦10,000 + ₦1,000 + ₦89,000 = ₦100,000 ✓
```

> `deductVendorAvailableForPayout(storeId, requestedAmount)` mirrors this total across the wallet cache.

---

## 10. Fund Flow Logic

### Stage 1: Student Payment Confirmed

_Triggered by Flutterwave webhook on successful payment_

1. Create **Transaction Record** with Flutterwave reference and per-vendor suborder breakdowns
2. Write **PAYMENT_RECEIVED** journal entry (one per order):
   - `DEBIT PLATFORM_ESCROW` (gross order amount)
   - `CREDIT CUSTOMER_REFUND_PAYABLE` (gross order amount)
3. Write **ORDER_SETTLED** journal entry (one per order, spanning all vendors):
   - `DEBIT CUSTOMER_REFUND_PAYABLE` (gross order amount)
   - `CREDIT VENDOR_PENDING` × n (one line per vendor, settle amount each)
   - `CREDIT PLATFORM_REVENUE_COMMISSION` (total commission)
4. Update each **Vendor Wallet** — add settle amount to `pending`
5. Update **Platform Wallet** — add commission to `commission` balance

**Vendor wallet state after Stage 1:**

```
available: 0
pending:   settleAmount  ← awaiting confirmation
disputed:  0
```

---

### Stage 2: Order Confirmed

_Triggered by student confirmation or auto-confirm after 3 days_

1. Write **FUNDS_RELEASED** journal entry (one per suborder):
   - `DEBIT VENDOR_AVAILABLE` (settle amount)
   - `CREDIT VENDOR_PENDING` (settle amount)
2. Update **Transaction Record** suborder status → `SETTLED`
3. Update **Vendor Wallet** — subtract from `pending`, add to `available`

**Vendor wallet state after Stage 2:**

```
available: settleAmount  ← ready for withdrawal
pending:   0
disputed:  0
```

---

### Stage 3: Dispute Opened

_Triggered when student raises a dispute on a delivered suborder_

> Requires detailed written description and at least one photo evidence. Can only be raised on suborders with delivery status `Delivered`.

1. Upload evidence to Cloudinary (before session — network calls don't belong in transactions)
2. Create **Dispute Record** with `status: OPEN` and deadline = +5 business days
3. Write **DISPUTE_OPENED** journal entry:
   - `DEBIT VENDOR_DISPUTED` (settle amount)
   - `CREDIT VENDOR_AVAILABLE` (settle amount)
4. Update **Transaction Record** suborder status → `DISPUTED`
5. Update **Vendor Wallet** — subtract from `available`, add to `disputed`

**Vendor wallet state after Stage 3:**

```
available: 0
pending:   0
disputed:  settleAmount  ← frozen, visible to vendor
```

---

### Stage 4A: Dispute Upheld

_Triggered when platform team rules in favour of the student_

1. Write **DISPUTE_UPHELD** journal entry (four lines, two balanced pairs):
   - `DEBIT VENDOR_DISPUTED` (settle amount)
   - `CREDIT CUSTOMER_REFUND_PAYABLE` (settle amount)
   - `DEBIT VENDOR_AVAILABLE` (penalty amount)
   - `CREDIT PLATFORM_REVENUE_PENALTIES` (penalty amount)
2. Update **Vendor Wallet:**
   - Subtract frozen amount from `disputed`
   - Subtract penalty from `available` (may go negative → creates debt)
   - If negative: below threshold → `recoveryType: PERCENTAGE_DEDUCTION`; above threshold → `recoveryType: FULL_BLOCK`
3. Update **Platform Wallet** — add penalty to `penalties` balance
4. Update **Dispute Record** → `status: RESOLVED`, `outcome: UPHELD`
5. Update **Transaction Record** suborder status → `REFUNDED`

---

### Stage 4B: Dispute Rejected

_Triggered when platform team rules in favour of the vendor_

1. Write **DISPUTE_REJECTED** journal entry:
   - `DEBIT VENDOR_AVAILABLE` (settle amount)
   - `CREDIT VENDOR_DISPUTED` (settle amount)
2. Update **Vendor Wallet** — subtract from `disputed`, add to `available`
3. Update **Dispute Record** → `status: RESOLVED`, `outcome: REJECTED`
4. Update **Transaction Record** suborder status → `SETTLED`

---

### Stage 4C: Dispute Auto-Resolved

_Triggered by background job if dispute remains unresolved at day 5_

Same financial flow as Stage 4A **except:**

- No penalty is applied to the vendor — the platform team failed to resolve in time, not the vendor
- Journal entry used: `writeDisputeAutoResolved` (pair 1 of DISPUTE_UPHELD only):
  - `DEBIT VENDOR_DISPUTED` (settle amount)
  - `CREDIT CUSTOMER_REFUND_PAYABLE` (settle amount)
- **Dispute Record** → `status: AUTO_RESOLVED`, `resolvedBy: SYSTEM`
- Vendor account flagged for review

> **Background job:** Sends a 24-hour warning alert to the platform team at day 4 before auto-resolution fires at day 5.

---

### Stage 4D: Dispute Inconclusive

_Triggered when the platform team cannot make a clear judgment_

1. Update **Dispute Record** → `status: AWAITING_EVIDENCE`
2. Set `additionalEvidenceDeadline` to +48 hours
3. No journal entries — funds remain frozen in `VENDOR_DISPUTED`, no wallet changes

**After 48 hours:**

- Student provides stronger evidence → case re-evaluated → flows to 4A or 4B
- Student fails to respond → `DisputeEvidenceExpiryService` fires:
  - Same financial flow as Stage 4B (rejected)
  - `resolvedBy: SYSTEM`

---

### Stage 5: Vendor Requests Payout

_Triggered when vendor initiates a withdrawal_

1. Validate store, password, and bank account
2. Fetch vendor wallet — reject if `FULL_BLOCK` debt or insufficient balance
3. Calculate fee breakdown (see §9)
4. Create **Payout Record** → `status: INITIATED`
5. If `recoveryDeduction > 0`: write **DEBT_RECOVERY** journal entry, reduce wallet debt cache
6. If `processingFee > 0`: write **PAYOUT_PROCESSING_FEE** journal entry
7. Write **PAYOUT_INITIATED** journal entry — net amount enters `PAYOUT_PROCESSING`
8. If `gatewayFee > 0`: write **GATEWAY_FEE** journal entry
9. Update **Vendor Wallet** — deduct full `requestedAmount` from `available`
10. Background job picks up `INITIATED` payouts and calls Flutterwave Transfer API

---

### Stage 6: Payout Outcome

_Triggered by Flutterwave transfer webhook_

**If SUCCESSFUL:**

1. Update **Payout Record** → `status: COMPLETED`
2. Write **PAYOUT_COMPLETED** journal entry:
   - `DEBIT PLATFORM_ESCROW` (net amount — funds leave the platform)
   - `DEBIT GATEWAY_FEES_EXPENSE` (gateway fee, if applicable)
   - `CREDIT PAYOUT_PROCESSING` (net + gateway fee — processing account closed)

**If FAILED** (webhook) **or API call failed** (processing service):

1. Update **Payout Record** → `status: FAILED`, populate `failureReason`
2. Write **PAYOUT_FAILED** journal entry:
   - `DEBIT VENDOR_AVAILABLE` (net amount)
   - `CREDIT PAYOUT_PROCESSING` (net amount)
3. If `processingFee > 0`: write **PAYOUT_PROCESSING_FEE_REVERSAL** journal entry
4. If `gatewayFee > 0`: write **GATEWAY_FEE_REVERSAL** journal entry
5. Update **Vendor Wallet** — restore full `requestedAmount` to `available`
6. Notify vendor of failure and reason

> **Note on gateway fee reversal at webhook failure:** Whether Flutterwave actually charged the fee on a transfer that reached them but failed in processing varies by their policy. The reversal is recorded conservatively. Adjust if Flutterwave confirms they charge on failed transfers.

---

## 11. Fund Flow Diagram

```
Student Pays
    │
    ▼
writePaymentReceived
  DEBIT  PLATFORM_ESCROW           ← funds enter escrow
  CREDIT CUSTOMER_REFUND_PAYABLE   ← platform liability created
    │
    ▼
writeOrderSettlement
  DEBIT  CUSTOMER_REFUND_PAYABLE   ← liability settled
  CREDIT VENDOR_PENDING (×n)       ← each vendor's settle amount
  CREDIT PLATFORM_REVENUE_COMMISSION
    │
    ▼
Order Confirmed (Student or Auto-Confirm at 3 days)
    │
    ▼
writeFundsReleased
  DEBIT  VENDOR_AVAILABLE          ← funds become withdrawable
  CREDIT VENDOR_PENDING
    │
    ├──── Dispute Opened
    │         │
    │         ▼
    │     writeDisputeOpened
    │       DEBIT  VENDOR_DISPUTED
    │       CREDIT VENDOR_AVAILABLE
    │         │
    │         ▼
    │     Platform Team Reviews (5 business days)
    │         │
    │         ├── Upheld ──── writeDisputeUpheld
    │         │                 DEBIT  VENDOR_DISPUTED
    │         │                 CREDIT CUSTOMER_REFUND_PAYABLE
    │         │                 DEBIT  VENDOR_AVAILABLE (penalty)
    │         │                 CREDIT PLATFORM_REVENUE_PENALTIES
    │         │
    │         ├── Rejected ── writeDisputeRejected
    │         │                 DEBIT  VENDOR_AVAILABLE
    │         │                 CREDIT VENDOR_DISPUTED
    │         │
    │         ├── Auto-Resolved (day 5, no penalty)
    │         │               writeDisputeAutoResolved
    │         │                 DEBIT  VENDOR_DISPUTED
    │         │                 CREDIT CUSTOMER_REFUND_PAYABLE
    │         │
    │         └── Inconclusive → 48hr evidence window
    │                             → Upheld or Rejected
    │
    ▼
Vendor Requests Payout
    │
    ├── writeDebtRecovery (if debt outstanding)
    │     DEBIT  DEBT_RECOVERY_CLEARING / CREDIT VENDOR_AVAILABLE
    │     DEBIT  PLATFORM_REVENUE_PENALTIES / CREDIT DEBT_RECOVERY_CLEARING
    │
    ├── writePayoutProcessingFee (if fee > 0)
    │     DEBIT  VENDOR_AVAILABLE / CREDIT PLATFORM_REVENUE_COMMISSION
    │
    ├── writePayoutInitiated
    │     DEBIT  PAYOUT_PROCESSING / CREDIT VENDOR_AVAILABLE
    │
    └── writeGatewayFee (if fee > 0)
          DEBIT  GATEWAY_FEES_EXPENSE / CREDIT PLATFORM_ESCROW
    │
    ▼
Flutterwave Transfer API
    │
    ├── SUCCESSFUL → writePayoutCompleted
    │                  DEBIT  PLATFORM_ESCROW + GATEWAY_FEES_EXPENSE
    │                  CREDIT PAYOUT_PROCESSING
    │
    └── FAILED → writePayoutFailed + fee reversals + wallet restoration
```

---

## 12. Dispute Policy

### Eligibility

- Can only be raised on suborders with delivery status `Delivered`
- Requires a written reason of at least 20 characters and at least one photo
- One active dispute per suborder at a time (enforced by partial unique index and application guard)

### Applicable Reasons

- **Late delivery** — objective, policy-led resolution
- **Wrong or substandard products** — subjective, human-led resolution

### Fund Handling During Dispute

- Only the **disputed suborder's settle amount** is frozen — in `VENDOR_DISPUTED`
- All other vendor wallet funds remain fully accessible
- Vendor has full visibility into frozen funds and the reason

### Resolution Timeline

| Day   | Event                                       |
| ----- | ------------------------------------------- |
| Day 0 | Dispute opened                              |
| Day 4 | 24-hour warning alert sent to platform team |
| Day 5 | Auto-resolution fires if unresolved         |

### Resolution Outcomes

| Outcome          | Journal Entry Used         | Financial Result                 |
| ---------------- | -------------------------- | -------------------------------- |
| Upheld           | `writeDisputeUpheld`       | Refund issued + vendor penalised |
| Rejected         | `writeDisputeRejected`     | Frozen funds returned to vendor  |
| Auto-Resolved    | `writeDisputeAutoResolved` | Refund issued, no penalty        |
| Evidence Expired | `writeDisputeRejected`     | Frozen funds returned to vendor  |

### Penalty & Debt Recovery

- Penalty is deducted from the vendor's `available` balance
- If insufficient, wallet goes negative (debt recorded on wallet document)
- Debt recovery is automatic on future payouts:
  - **Below threshold:** fixed percentage deducted per payout (`PERCENTAGE_DEDUCTION`)
  - **Above threshold:** all payouts blocked until debt cleared (`FULL_BLOCK`)
- Penalty revenue and recovered debt are both credited to `PLATFORM_REVENUE_PENALTIES`
- Vendor is notified of debt status and recovery method

---

## 13. Payout System

### Eligibility

- Vendor must have an active store status
- Vendor must have sufficient `available` balance
- Vendor must not have a `FULL_BLOCK` debt recovery type
- Vendor must provide correct store password to authorise the withdrawal

### Processing

- Payouts with `status: INITIATED` are picked up by a daily background job (`PayoutProcessingService`)
- The job calls Flutterwave's Transfer API for each initiated payout (oldest first — FIFO)
- Failed API calls are reversed immediately by the processing service
- Successful API calls move the payout to `PROCESSING` — the webhook handles the final outcome

### Failure Handling

- **API call fails (never reached Flutterwave):** `PayoutProcessingService.reversePayout` — all journal entries reversed, wallet restored
- **Transfer fails at Flutterwave (webhook):** `PayoutWebhookHandler.handleFailure` — same reversal pattern

In both failure cases, `requestedAmount` is restored to `VENDOR_AVAILABLE` and all fee journal entries are reversed.

---

## 14. Reconciliation

### Global Balance Check (`checkGlobalBalance`)

Verifies that the sum of all CREDIT ledger lines equals the sum of all DEBIT ledger lines across the entire system. A non-zero delta indicates a data integrity problem — either a write bypassed `JournalEntryWriter`, or a ledger line was modified after creation (which should be impossible given the immutable schema).

Can be scoped to a date range to avoid full-collection scans:

```typescript
const result = await checkGlobalBalance(dateFrom, dateTo);
// { totalCredits, totalDebits, isBalanced, delta }
```

### Vendor Wallet Reconciliation (`reconcileVendorWallet`)

Reconstructs expected wallet balances for a vendor by aggregating their ledger lines and compares against the stored `VendorWallet` document. Detects drift between the wallet cache and the ledger.

```typescript
const result = await reconcileVendorWallet(vendorId);
// { stored, derived, isBalanced, discrepancies }
```

**Account → wallet bucket mapping:**

| accountType        | type   | Effect        |
| ------------------ | ------ | ------------- |
| `VENDOR_PENDING`   | CREDIT | `pending` ↑   |
| `VENDOR_PENDING`   | DEBIT  | `pending` ↓   |
| `VENDOR_AVAILABLE` | CREDIT | `available` ↑ |
| `VENDOR_AVAILABLE` | DEBIT  | `available` ↓ |
| `VENDOR_DISPUTED`  | CREDIT | `disputed` ↑  |
| `VENDOR_DISPUTED`  | DEBIT  | `disputed` ↓  |

`total` is derived as `available + pending + disputed`.

### When to Run

- `checkGlobalBalance` — daily Cron job, scoped to the previous 24 hours
- `reconcileVendorWallet` — on-demand from admin routes, or triggered when a wallet discrepancy is suspected

---

## 15. Open Items & Future Considerations

### Defined — Pending Business Decision

| Item                               | Notes                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| Negative wallet recovery threshold | Kobo value that determines PERCENTAGE_DEDUCTION vs FULL_BLOCK                       |
| Penalty amount structure           | Fixed fine, percentage of order value, or strike-based system                       |
| Payout scheduling                  | Manual on-demand vs automated scheduled disbursements (e.g. weekly NET-7)           |
| Platform revenue withdrawal        | Procedure for withdrawing accumulated platform wallet balance — not yet implemented |

### Planned Future Features

| Feature                     | Notes                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Subscription model          | Additional revenue stream for vendors — financial system to be extended            |
| Digital products            | Instant delivery removes confirmation gap — simpler fund release logic             |
| Automated payout scheduling | Scheduled disbursements on fixed cycles                                            |
| CBN compliance review       | As transaction volume grows, platform may need to assess payment service licensing |

---

_This document must be updated whenever a financial policy, data model, journal entry map, or fund flow stage changes. Never let implementation diverge silently from this document._

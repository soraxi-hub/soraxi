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
14. [Refund System](#14-refund-system)
15. [Reconciliation](#15-reconciliation)
16. [Open Items & Future Considerations](#16-open-items--future-considerations)

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

4. **Suborder-Level Granularity** — All financial operations (settlement, disputes, freezing, payouts, refunds) are scoped to the suborder, not the order.

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

Moves money from the platform to a vendor's real bank account via Flutterwave's Transfer API. Every payout attempt — initiated, completed, or failed — is fully logged with journal entries. Has both an automated (API-driven) path and a manual (admin-driven) path.

### 8. The Refund System

Returns money from the platform to a student's original payment method via Flutterwave's Refund API. Triggered by order cancellation, failed delivery, or upheld disputes. Every refund attempt is tracked in a `RefundRecord` document. Has both an automated and a manual admin path, mirroring the payout system.

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

| Event                                  | Debit                                                  | Credit                                                       |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| **PAYMENT_RECEIVED**                   | `PLATFORM_ESCROW` (gross)                              | `CUSTOMER_REFUND_PAYABLE` (gross)                            |
| **ORDER_SETTLED**                      | `CUSTOMER_REFUND_PAYABLE` (gross)                      | `VENDOR_PENDING` × n vendors + `PLATFORM_REVENUE_COMMISSION` |
| **FUNDS_RELEASED**                     | `VENDOR_AVAILABLE` (settle)                            | `VENDOR_PENDING` (settle)                                    |
| **DISPUTE_OPENED**                     | `VENDOR_DISPUTED` (settle)                             | `VENDOR_AVAILABLE` (settle)                                  |
| **DISPUTE_REJECTED**                   | `VENDOR_AVAILABLE` (settle)                            | `VENDOR_DISPUTED` (settle)                                   |
| **DISPUTE_UPHELD** (pair 1)            | `VENDOR_DISPUTED` (settle)                             | `CUSTOMER_REFUND_PAYABLE` (settle)                           |
| **DISPUTE_UPHELD** (pair 2)            | `PLATFORM_REVENUE_COMMISSION` (commission)             | `CUSTOMER_REFUND_PAYABLE` (commission)                       |
| **DISPUTE_UPHELD** (pair 3)            | `VENDOR_AVAILABLE` (penalty)                           | `PLATFORM_REVENUE_PENALTIES` (penalty)                       |
| **DISPUTE_AUTO_RESOLVED** (pair 1)     | `VENDOR_DISPUTED` (settle)                             | `CUSTOMER_REFUND_PAYABLE` (settle)                           |
| **DISPUTE_AUTO_RESOLVED** (pair 2)     | `PLATFORM_REVENUE_COMMISSION` (commission)             | `CUSTOMER_REFUND_PAYABLE` (commission)                       |
| **ORDER_CANCELLATION_REFUND** (pair 1) | `VENDOR_PENDING` (settle)                              | `CUSTOMER_REFUND_PAYABLE` (settle)                           |
| **ORDER_CANCELLATION_REFUND** (pair 2) | `PLATFORM_REVENUE_COMMISSION` (commission)             | `CUSTOMER_REFUND_PAYABLE` (commission)                       |
| **FAILED_DELIVERY_REFUND**             | `VENDOR_PENDING` (settle)                              | `CUSTOMER_REFUND_PAYABLE` (settle)                           |
| **REFUND_CONFIRMED**                   | `CUSTOMER_REFUND_PAYABLE` (amountRefunded)             | `PLATFORM_ESCROW` (amountRefunded)                           |
| **DEBT_RECOVERY** (pair 1)             | `DEBT_RECOVERY_CLEARING` (amount)                      | `VENDOR_AVAILABLE` (amount)                                  |
| **DEBT_RECOVERY** (pair 2)             | `PLATFORM_REVENUE_PENALTIES` (amount)                  | `DEBT_RECOVERY_CLEARING` (amount)                            |
| **PAYOUT_PROCESSING_FEE**              | `VENDOR_AVAILABLE` (fee)                               | `PLATFORM_REVENUE_COMMISSION` (fee)                          |
| **PAYOUT_INITIATED**                   | `PAYOUT_PROCESSING` (net)                              | `VENDOR_AVAILABLE` (net)                                     |
| **PAYOUT_COMPLETED**                   | `PLATFORM_ESCROW` (net) + `GATEWAY_FEES_EXPENSE` (fee) | `PAYOUT_PROCESSING` (net + fee)                              |
| **PAYOUT_FAILED**                      | `VENDOR_AVAILABLE` (net)                               | `PAYOUT_PROCESSING` (net)                                    |
| **PAYOUT_PROCESSING_FEE_REVERSAL**     | `PLATFORM_REVENUE_COMMISSION` (fee)                    | `VENDOR_AVAILABLE` (fee)                                     |
| **GATEWAY_FEE**                        | `GATEWAY_FEES_EXPENSE` (fee)                           | `PLATFORM_ESCROW` (fee)                                      |
| **GATEWAY_FEE_REVERSAL**               | `PLATFORM_ESCROW` (fee)                                | `GATEWAY_FEES_EXPENSE` (fee)                                 |

> **DISPUTE_UPHELD** produces six lines sharing one `journalId` (three balanced pairs): pair 1 moves the frozen settle amount into `CUSTOMER_REFUND_PAYABLE`, pair 2 reverses the commission into `CUSTOMER_REFUND_PAYABLE` so the student receives the full `amountPaid` back, and pair 3 applies the penalty. Total `CUSTOMER_REFUND_PAYABLE` credit = `settleAmount + commission = amountPaid`.
>
> **DISPUTE_AUTO_RESOLVED** produces four lines (two balanced pairs): same as DISPUTE_UPHELD pairs 1 and 2 but **no penalty pair** — the platform team failed to resolve in time, so the vendor is not penalised.
>
> **ORDER_CANCELLATION_REFUND** produces four lines (two balanced pairs): same structure as DISPUTE_AUTO_RESOLVED but operates on `VENDOR_PENDING` (funds not yet released) rather than `VENDOR_DISPUTED`.
>
> **FAILED_DELIVERY_REFUND** produces two lines (one pair): only the settle amount is reversed. Commission is **not** reversed — it is retained by Soraxi since the vendor attempted delivery.

### Writer Methods

| Method                             | Event                                                                 |
| ---------------------------------- | --------------------------------------------------------------------- |
| `writePaymentReceived`             | Student payment enters escrow                                         |
| `writeOrderSettlement`             | Escrow split to vendors + platform on order confirmation              |
| `writeFundsReleased`               | Pending → available on delivery confirmation                          |
| `writeDisputeOpened`               | Available → disputed on dispute open                                  |
| `writeDisputeRejected`             | Disputed → available on rejection                                     |
| `writeDisputeUpheld`               | Full refund (settle + commission) + penalty on upheld dispute         |
| `writeDisputeAutoResolved`         | Full refund (settle + commission) on auto-resolution — no penalty     |
| `writeOrderCancellationRefund`     | Full refund (settle + commission reversed) on vendor cancellation     |
| `writeFailedDeliveryRefund`        | Partial refund (settle only) on failed delivery — commission retained |
| `writeRefundConfirmed`             | Closes `CUSTOMER_REFUND_PAYABLE` liability once Flutterwave confirms  |
| `writeDebtRecovery`                | Debt withheld from payout via clearing account                        |
| `writePayoutProcessingFee`         | Soraxi processing fee deducted from payout                            |
| `writePayoutInitiated`             | Net amount enters PAYOUT_PROCESSING                                   |
| `writePayoutCompleted`             | Processing account closed, escrow reduced                             |
| `writePayoutFailed`                | Processing account reversed to vendor available                       |
| `writePayoutProcessingFeeReversal` | Processing fee returned on payout failure                             |
| `writeGatewayFee`                  | Flutterwave fee recorded as platform expense                          |
| `writeGatewayFeeReversal`          | Gateway fee reversed on payout failure                                |

---

## 6. Chart of Accounts

These are the logical accounts in Soraxi's double-entry system. Every ledger line references exactly one account type.

| Account                       | Type      | Description                                                                                   |
| ----------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| `PLATFORM_ESCROW`             | Asset     | Money held on behalf of customers/vendors for in-flight orders                                |
| `VENDOR_PENDING`              | Liability | Vendor funds awaiting order confirmation                                                      |
| `VENDOR_AVAILABLE`            | Liability | Vendor funds cleared and ready to withdraw                                                    |
| `VENDOR_DISPUTED`             | Liability | Vendor funds frozen due to an open dispute                                                    |
| `PLATFORM_REVENUE_COMMISSION` | Revenue   | Commission income earned from sales and payout processing fees                                |
| `PLATFORM_REVENUE_PENALTIES`  | Revenue   | Penalty income earned from upheld disputes + debt recovery                                    |
| `CUSTOMER_REFUND_PAYABLE`     | Liability | Amount owed back to a customer — opened on refund trigger, closed on Flutterwave confirmation |
| `PAYOUT_PROCESSING`           | Asset     | Funds in-flight to a vendor's bank account via Flutterwave                                    |
| `GATEWAY_FEES_EXPENSE`        | Expense   | Flutterwave transfer fees recorded as a platform expense                                      |
| `DEBT_RECOVERY_CLEARING`      | Clearing  | Intermediate account used when recovering vendor debt from payouts                            |

---

## 7. Data Models

### JournalEntry

```typescript
{
  _id: ObjectId,
  category: LedgerEntryCategory,      // The financial event type
  referenceType: LedgerReferenceType, // "SUBORDER" | "DISPUTE" | "PAYOUT" | "PENALTY" | "REFUND"
  referenceId: ObjectId,              // _id of the triggering document
  description: string,
  metadata?: Record<string, unknown>,
  createdAt: Date                     // Immutable — no updatedAt
}
```

**Indexes:** `{ referenceId, referenceType }` compound, `category`

---

### LedgerLine

```typescript
{
  _id: ObjectId,
  journalId: ObjectId,            // Foreign key to JournalEntry
  type: "credit" | "debit",
  accountType: LedgerAccountType, // Which account in the chart of accounts
  entityId?: ObjectId,            // Only for VENDOR_* and CUSTOMER_* lines
  entityType?: "vendor" | "customer", // Only when entityId is set
  amount: number,                 // In Kobo — always a positive integer ≥ 1
  createdAt: Date                 // Immutable — no updatedAt
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
    recoveryType: string,        // "PERCENTAGE_DEDUCTION" | "FULL_BLOCK"
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
>
> Balances are maintained as a running state updated alongside journal entries via `creditPlatformCommission`, `debitPlatformCommission`, and `creditPlatformPenalty`. The ledger is always authoritative. There is currently no automated platform wallet reconciliation function — only `reconcileVendorWallet` exists for vendor wallets. This is tracked in §16 Open Items.

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
    requestedAmount: number,             // Full amount requested by vendor (Kobo)
    debtRecoveryDeductionAmount: number, // Amount withheld for debt recovery (Kobo)
    debtBeforeRecovery?: number,
    debtAfterRecovery?: number,
    debtRecoveryPercentage?: number,
    fixedProcessingFee: number,
    percentageProcessingFee: number,
    processingFee: number,               // fixedFee + percentageFee (Kobo)
    gatewayFee?: number,                 // Flutterwave transfer fee (Kobo)
    netAmount: number                    // Final transfer amount to vendor (Kobo)
  },
  bankDetails: {                         // Snapshot at time of request
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

### Refund Record

```typescript
{
  _id: ObjectId,
  suborderId: ObjectId,
  orderId: ObjectId,
  vendorId: ObjectId,
  customerId: ObjectId,
  trigger: RefundTrigger,          // "ORDER_CANCELLED" | "FAILED_DELIVERY" | "DISPUTE_UPHELD" | "DISPUTE_AUTO_RESOLVED"
  amountBreakdown: {
    amountRefunded: number,        // Amount returned to student (Kobo)
    settleAmount: number,          // Vendor's net settle amount for this suborder (Kobo)
    commission: number             // Platform commission (Kobo) — reversed for ORDER_CANCELLED and DISPUTE_UPHELD; retained for FAILED_DELIVERY
  },
  flutterwaveTransactionId: string, // Original payment transaction ID — used to call the refund API
  flutterwaveRefundId?: string,     // Flutterwave refund ID returned after API call or pasted by admin
  status: "INITIATED" | "COMPLETED" | "FAILED",
  manualReference?: string,         // Admin-supplied reference for the manual path
  failureReason?: string,
  ledgerEntryId: ObjectId,          // referenceId used in the trigger-specific journal entry
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:** `suborderId`, `orderId`, `vendorId`, `customerId`, `trigger`, `status`, `flutterwaveRefundId` (sparse), `{ vendorId, createdAt }` compound, partial unique on `{ suborderId, status }` for `INITIATED` and `COMPLETED` states to prevent double-refunds.

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

### Commission Retention Policy

| Scenario                                   | Commission Treatment                          |
| ------------------------------------------ | --------------------------------------------- |
| Order delivered and confirmed              | Retained                                      |
| Vendor cancels (OrderPlaced or Processing) | Reversed — sale never completed               |
| Failed Delivery (OutForDelivery)           | Retained — vendor attempted delivery          |
| Dispute upheld in student's favour         | Reversed — student receives full `amountPaid` |
| Dispute auto-resolved (platform timeout)   | Reversed — student receives full `amountPaid` |
| Dispute rejected in vendor's favour        | Retained — no refund issued                   |

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

1. Write **DISPUTE_UPHELD** journal entry (six lines, three balanced pairs):
   - Pair 1: `DEBIT VENDOR_DISPUTED` (settle) / `CREDIT CUSTOMER_REFUND_PAYABLE` (settle)
   - Pair 2: `DEBIT PLATFORM_REVENUE_COMMISSION` (commission) / `CREDIT CUSTOMER_REFUND_PAYABLE` (commission)
   - Pair 3: `DEBIT VENDOR_AVAILABLE` (penalty) / `CREDIT PLATFORM_REVENUE_PENALTIES` (penalty)
   - Total `CUSTOMER_REFUND_PAYABLE` credit = settle + commission = **full `amountPaid`**
2. Update **Vendor Wallet:**
   - Subtract frozen amount from `disputed`
   - Subtract penalty from `available` (may go negative → creates debt)
   - If negative: below threshold → `recoveryType: PERCENTAGE_DEDUCTION`; above threshold → `recoveryType: FULL_BLOCK`
3. Update **Platform Wallet**:
   - Subtract `commission` from `commission` balance (`debitPlatformCommission`) — mirrors pair 2 of the journal entry
   - Add `penaltyAmount` to `penalties` balance (`creditPlatformPenalty`) — mirrors pair 3 of the journal entry
4. Update **Dispute Record** → `status: RESOLVED`, `outcome: UPHELD`
5. Update **Transaction Record** suborder status → `REFUNDED`
6. Call **RefundService.processDisputeRefund** — creates `RefundRecord` and calls Flutterwave refund API for `amountPaid` (settle + commission)

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

- **No penalty** is applied to the vendor — the platform team failed to resolve in time, not the vendor
- Journal entry used: `writeDisputeAutoResolved` (two balanced pairs — pairs 1 and 2 of DISPUTE_UPHELD, no penalty pair):
  - Pair 1: `DEBIT VENDOR_DISPUTED` (settle) / `CREDIT CUSTOMER_REFUND_PAYABLE` (settle)
  - Pair 2: `DEBIT PLATFORM_REVENUE_COMMISSION` (commission) / `CREDIT CUSTOMER_REFUND_PAYABLE` (commission)
  - Total `CUSTOMER_REFUND_PAYABLE` credit = settle + commission = **full `amountPaid`**
- Update **Platform Wallet** — subtract `commission` from `commission` balance (`debitPlatformCommission`), mirroring pair 2 of the journal entry
- **Dispute Record** → `status: AUTO_RESOLVED`, `resolvedBy: SYSTEM`
- Vendor account flagged for review
- Call **RefundService.processDisputeRefund** for `amountPaid`

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
10. Automated path: background job picks up `INITIATED` payouts and calls Flutterwave Transfer API. Manual path: admin executes transfer on Flutterwave dashboard and confirms via admin panel (see §13)

---

### Stage 6: Payout Outcome

_Triggered by Flutterwave transfer webhook (automated) or admin confirmation (manual)_

**If SUCCESSFUL:**

1. Update **Payout Record** → `status: COMPLETED`, store Flutterwave transfer reference
2. Write **PAYOUT_COMPLETED** journal entry:
   - `DEBIT PLATFORM_ESCROW` (net amount — funds leave the platform)
   - `DEBIT GATEWAY_FEES_EXPENSE` (gateway fee, if applicable)
   - `CREDIT PAYOUT_PROCESSING` (net + gateway fee — processing account closed)

**If FAILED** (webhook, API call failure, or admin marks as failed):

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

### Stage 7A: Vendor Cancels Order

_Triggered when vendor transitions suborder status to `Canceled` from `OrderPlaced` or `Processing`_

> Funds are guaranteed to be in `VENDOR_PENDING` — cancellation is blocked once the order reaches `Shipped`.

1. Transition suborder `deliveryStatus` → `Canceled`
2. Call **RefundService.processOrderCancellationRefund** (within the same session):
   - Write **ORDER_CANCELLATION_REFUND** journal entry (four lines, two balanced pairs):
     - Pair 1: `DEBIT VENDOR_PENDING` (settle) / `CREDIT CUSTOMER_REFUND_PAYABLE` (settle)
     - Pair 2: `DEBIT PLATFORM_REVENUE_COMMISSION` (commission) / `CREDIT CUSTOMER_REFUND_PAYABLE` (commission)
     - Total `CUSTOMER_REFUND_PAYABLE` credit = settle + commission = **full `amountPaid`**
   - Update **Platform Wallet** — subtract `commission` from `commission` balance (`debitPlatformCommission`), mirroring pair 2 of the journal entry
   - Subtract `settleAmount` from vendor wallet `pending` and `total`
   - Update **Transaction Record** suborder status → `REFUNDED`
   - Create **RefundRecord** → `status: INITIATED`, `trigger: ORDER_CANCELLED`
   - Call Flutterwave refund API (outside session) for `amountPaid`

---

### Stage 7B: Failed Delivery

_Triggered when vendor transitions suborder status to `FailedDelivery` from `OutForDelivery`_

> Funds are still in `VENDOR_PENDING` — delivery confirmation (student or auto-confirm) has not yet occurred.

1. Transition suborder `deliveryStatus` → `FailedDelivery`
2. Call **RefundService.processFailedDeliveryRefund** (within the same session):
   - Write **FAILED_DELIVERY_REFUND** journal entry (two lines):
     - `DEBIT VENDOR_PENDING` (settle)
     - `CREDIT CUSTOMER_REFUND_PAYABLE` (settle)
     - Commission is **NOT** reversed — retained by Soraxi
   - Subtract `settleAmount` from vendor wallet `pending` and `total`
   - Update **Transaction Record** suborder status → `REFUNDED`
   - Create **RefundRecord** → `status: INITIATED`, `trigger: FAILED_DELIVERY`
   - Call Flutterwave refund API (outside session) for `settleAmount`

---

### Stage 8: Refund Confirmation

_Triggered by Flutterwave refund webhook (automated) or admin confirmation (manual)_

**If SUCCESSFUL (webhook or admin confirms):**

1. Write **REFUND_CONFIRMED** journal entry:
   - `DEBIT CUSTOMER_REFUND_PAYABLE` (amountRefunded)
   - `CREDIT PLATFORM_ESCROW` (amountRefunded)
2. Update **RefundRecord** → `status: COMPLETED`, store Flutterwave refund ID
3. Notify customer — refund will appear on their original payment method within 3–15 business days

**If FAILED (webhook or admin marks as failed):**

1. Update **RefundRecord** → `status: FAILED`, populate `failureReason`
2. `CUSTOMER_REFUND_PAYABLE` liability remains open — manual follow-up required
3. Admin alert fired — intervention needed to close the liability

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
    ├──────────────────────────────────────────────────────────┐
    │  Vendor Cancels (OrderPlaced or Processing)              │
    │      │                                                   │
    │      ▼                                                   │
    │  writeOrderCancellationRefund                            │
    │    DEBIT  VENDOR_PENDING (settle)                        │
    │    CREDIT CUSTOMER_REFUND_PAYABLE (settle)               │
    │    DEBIT  PLATFORM_REVENUE_COMMISSION (commission)       │
    │    CREDIT CUSTOMER_REFUND_PAYABLE (commission)           │
    │      │                                                   │
    │      └──► Flutterwave Refund API → writeRefundConfirmed  │
    │             DEBIT  CUSTOMER_REFUND_PAYABLE               │
    │             CREDIT PLATFORM_ESCROW                       │
    │                                                          │
    ▼                                                          │
Order Confirmed (Student or Auto-Confirm at 3 days)           │
    │                                                          │
    ├──────────────────────────────────────────────────────────┘
    │  (if not cancelled first)
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
    │         ├── Upheld ──── writeDisputeUpheld (6 lines)
    │         │                 DEBIT  VENDOR_DISPUTED (settle)
    │         │                 CREDIT CUSTOMER_REFUND_PAYABLE (settle)
    │         │                 DEBIT  PLATFORM_REVENUE_COMMISSION (commission)
    │         │                 CREDIT CUSTOMER_REFUND_PAYABLE (commission)
    │         │                 DEBIT  VENDOR_AVAILABLE (penalty)
    │         │                 CREDIT PLATFORM_REVENUE_PENALTIES (penalty)
    │         │                   └──► RefundService → Flutterwave Refund API
    │         │                          → writeRefundConfirmed
    │         │
    │         ├── Rejected ── writeDisputeRejected
    │         │                 DEBIT  VENDOR_AVAILABLE
    │         │                 CREDIT VENDOR_DISPUTED
    │         │
    │         ├── Auto-Resolved (day 5, no penalty)
    │         │               writeDisputeAutoResolved (4 lines)
    │         │                 DEBIT  VENDOR_DISPUTED (settle)
    │         │                 CREDIT CUSTOMER_REFUND_PAYABLE (settle)
    │         │                 DEBIT  PLATFORM_REVENUE_COMMISSION (commission)
    │         │                 CREDIT CUSTOMER_REFUND_PAYABLE (commission)
    │         │                   └──► RefundService → Flutterwave Refund API
    │         │                          → writeRefundConfirmed
    │         │
    │         └── Inconclusive → 48hr evidence window
    │                             → Upheld or Rejected
    │
    ├──── Failed Delivery (OutForDelivery → FailedDelivery)
    │         │
    │         ▼
    │     writeFailedDeliveryRefund
    │       DEBIT  VENDOR_PENDING (settle)
    │       CREDIT CUSTOMER_REFUND_PAYABLE (settle)
    │       [commission retained]
    │         └──► Flutterwave Refund API → writeRefundConfirmed
    │                DEBIT  CUSTOMER_REFUND_PAYABLE
    │                CREDIT PLATFORM_ESCROW
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
Flutterwave Transfer API (automated) or Admin Manual Transfer
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

| Outcome          | Journal Entry Used         | Refund Amount to Student                | Commission Treatment | Penalty |
| ---------------- | -------------------------- | --------------------------------------- | -------------------- | ------- |
| Upheld           | `writeDisputeUpheld`       | Full `amountPaid` (settle + commission) | Reversed             | Yes     |
| Rejected         | `writeDisputeRejected`     | None                                    | Retained             | None    |
| Auto-Resolved    | `writeDisputeAutoResolved` | Full `amountPaid` (settle + commission) | Reversed             | None    |
| Evidence Expired | `writeDisputeRejected`     | None                                    | Retained             | None    |

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

### Automated Path

Payouts with `status: INITIATED` are picked up by a daily background job (`PayoutProcessingService.processInitiatedPayouts`) at 8am. The job calls Flutterwave's Transfer API for each initiated payout in FIFO order. Failed API calls are reversed immediately by the processing service. Successful API calls move the payout to `PROCESSING` — the Flutterwave transfer webhook handles the final outcome.

### Manual Path

Soraxi is deployed on Vercel, which does not support static egress IP addresses. Flutterwave requires IP whitelisting for the Transfer API. Until this is resolved, the manual path is available in parallel:

1. Admin views `INITIATED` payouts in the admin payout panel (`/admin/payouts`)
2. Admin opens the detail page, copies the bank details and net amount
3. Admin executes the transfer manually on the Flutterwave dashboard
4. Admin pastes the Flutterwave transfer reference back into the detail page and clicks "Confirm Payment"
5. `PayoutProcessingService.confirmManualPayout` writes the same `PAYOUT_COMPLETED` journal entry as the automated path

Admin can also mark a payout as failed from the detail page, which triggers the same full reversal (journal entries, wallet restoration) as an automated failure.

### Failure Handling

- **API call fails (never reached Flutterwave):** `PayoutProcessingService.reversePayout` — all journal entries reversed, wallet restored
- **Transfer fails at Flutterwave (webhook):** `PayoutWebhookHandler.handleFailure` — same reversal pattern
- **Admin marks as failed:** `PayoutProcessingService.confirmManualPayout` with `action: "fail"` — same reversal pattern

In all failure cases, `requestedAmount` is restored to `VENDOR_AVAILABLE` and all fee journal entries are reversed.

---

## 14. Refund System

### Overview

The refund system returns money to a student's original Flutterwave payment method. It is built around a `RefundRecord` model that tracks every refund attempt, and a `RefundService` that owns all refund logic — both automated and manual. The `RefundTrigger` enum keeps the system loosely coupled: new triggers can be added without rewriting the core service.

### Refund Triggers

| Trigger           | Eligible Delivery Statuses  | Financial State at Trigger                                         |
| ----------------- | --------------------------- | ------------------------------------------------------------------ |
| `ORDER_CANCELLED` | `OrderPlaced`, `Processing` | Funds in `VENDOR_PENDING`                                          |
| `FAILED_DELIVERY` | `OutForDelivery`            | Funds in `VENDOR_PENDING`                                          |
| `DISPUTE_UPHELD`  | `Delivered` (post-dispute)  | Funds were in `VENDOR_DISPUTED` (already moved by dispute service) |

### Refund Amounts

| Trigger           | Refund Amount                           | Commission         |
| ----------------- | --------------------------------------- | ------------------ |
| `ORDER_CANCELLED` | Full `amountPaid` (settle + commission) | Reversed           |
| `FAILED_DELIVERY` | `settleAmount` only                     | Retained by Soraxi |
| `DISPUTE_UPHELD`  | Full `amountPaid` (settle + commission) | Reversed           |

> **Platform wallet mirroring:** Whenever a journal entry reverses `PLATFORM_REVENUE_COMMISSION`, the platform wallet's `commission` cache must be debited in the same session via `debitPlatformCommission`. This applies to `DISPUTE_UPHELD`, `DISPUTE_AUTO_RESOLVED`, and `ORDER_CANCELLATION_REFUND`. It does **not** apply to `FAILED_DELIVERY_REFUND`, since commission is retained there. For dispute-triggered refunds, this debit happens at the dispute resolution call site (`procedures.ts` / `DisputeAutoResolutionService`) — never inside `RefundService` — to avoid double-counting, since the dispute service already wrote the journal entry before `RefundService.processDisputeRefund` is called.

### Automated Path

`RefundService` calls Flutterwave's `POST /v3/transactions/:id/refund` with the original `flutterwaveTransactionId` and the appropriate partial amount in Naira. Flutterwave posts back confirmation via webhook (must be enabled separately by contacting Flutterwave support — not on by default). On confirmation, `writeRefundConfirmed` fires and the `RefundRecord` moves to `COMPLETED`.

### Manual Path

When the automated API call fails, or while Vercel IP whitelisting prevents automated calls, the `RefundRecord` stays `INITIATED`. The manual flow:

1. Admin views `INITIATED` refunds in the admin refund panel (`/admin/refunds`)
2. Admin opens the detail page and copies the Flutterwave transaction ID
3. Admin executes the refund manually on the Flutterwave dashboard
4. Admin pastes the Flutterwave refund ID back and clicks "Confirm Refund"
5. `RefundService.confirmManualRefund` writes `writeRefundConfirmed` and marks the record `COMPLETED`

Admin can also mark a refund as failed. This leaves the `CUSTOMER_REFUND_PAYABLE` liability open — a follow-up action is required to close it.

### Flutterwave Constraint

Minimum refund amount: NGN 100. Soraxi's minimum order value means this is unlikely to be triggered in practice. It will surface as a Flutterwave API error if hit.

### Service Methods

| Method                           | Trigger                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `processOrderCancellationRefund` | Order status → `Canceled`                                        |
| `processFailedDeliveryRefund`    | Order status → `FailedDelivery`                                  |
| `processDisputeRefund`           | After `writeDisputeUpheld` or `writeDisputeAutoResolved` commits |
| `confirmManualRefund`            | Admin confirms via admin panel                                   |
| `handleRefundWebhook`            | Flutterwave refund webhook event                                 |

---

## 15. Reconciliation

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

- `checkGlobalBalance` — daily cron job, scoped to the previous 24 hours
- `reconcileVendorWallet` — on-demand from admin routes, or triggered when a wallet discrepancy is suspected

---

## 16. Open Items & Future Considerations

### Defined — Pending Business Decision

| Item                               | Notes                                                                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Negative wallet recovery threshold | Kobo value that determines PERCENTAGE_DEDUCTION vs FULL_BLOCK                                                                                                                                                                                   |
| Penalty amount structure           | Fixed fine, percentage of order value, or strike-based system                                                                                                                                                                                   |
| Payout scheduling                  | Manual on-demand vs automated scheduled disbursements (e.g. weekly NET-7)                                                                                                                                                                       |
| Platform revenue withdrawal        | Procedure for withdrawing accumulated platform wallet balance — not yet implemented                                                                                                                                                             |
| Vercel IP whitelisting             | Migrate to static IP host or proxy to enable fully automated payout and refund API calls                                                                                                                                                        |
| Flutterwave refund webhooks        | Must be requested from Flutterwave support — until enabled, only the manual admin path can close a refund                                                                                                                                       |
| Platform wallet reconciliation     | No automated function yet to detect drift between `PLATFORM_REVENUE_COMMISSION` / `PLATFORM_REVENUE_PENALTIES` ledger balances and the `PlatformWallet` cache document — only vendor-side reconciliation (`reconcileVendorWallet`) exists today |

### Planned Future Features

| Feature                     | Notes                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------- |
| Subscription model          | Additional revenue stream for vendors — financial system to be extended            |
| Digital products            | Instant delivery removes confirmation gap — simpler fund release logic             |
| Automated payout scheduling | Scheduled disbursements on fixed cycles                                            |
| CBN compliance review       | As transaction volume grows, platform may need to assess payment service licensing |

---

_This document must be updated whenever a financial policy, data model, journal entry map, or fund flow stage changes. Never let implementation diverge silently from this document._

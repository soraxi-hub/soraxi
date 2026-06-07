# Financial Architecture Documentation

> **Platform:** Soraxi Marketplace  
> **Last Updated:** May 2026  
> **Audience:** Internal developers and new team members  
> **Status:** Living document — update as the system evolves

---

## Table of Contents

1. [Overview](#overview)
2. [Business Context](#business-context)
3. [Core Principles](#core-principles)
4. [Core Components](#core-components)
5. [Data Models](#data-models)
6. [Commission Structure](#commission-structure)
7. [Fund Flow Logic](#fund-flow-logic)
8. [Dispute Policy](#dispute-policy)
9. [Payout System](#payout-system)
10. [Open Items & Future Considerations](#open-items--future-considerations)

---

## Overview

Soraxi is a marketplace for students and vendors within Nigerian tertiary institutions. The financial system manages the complete lifecycle of money from the moment a student makes a payment to the moment a vendor receives their earnings in their bank account.

The system is built on the following stack:
- **Backend/Frontend:** Next.js
- **Database:** MongoDB
- **Payment Gateway:** Flutterwave

All monetary values are stored and processed in **Kobo** (1 Naira = 100 Kobo) to avoid floating-point precision errors.

---

## Business Context

### Revenue Model
- **Primary:** Commission per vendor sale (tiered percentage + flat fee structure)
- **Planned:** Subscription model for vendors (future)

### Fund Flow Direction
Students pay the platform first. The platform holds the funds, deducts its commission, and disburses the remainder to the vendor after order confirmation.

### Order Structure
- A single **Order** can contain multiple **Suborders**, each belonging to a different vendor/store
- Financial operations always occur at the **suborder level**, never at the main order level
- This ensures vendor A's payout is never blocked by vendor B's activity

### Fulfillment Model
The platform operates a hybrid fulfillment model:
- **Vendor-fulfilled:** Vendor manages and delivers the order independently and updates the order status
- **Platform-fulfilled:** Platform manages delivery on the vendor's behalf and updates the order status

---

## Core Principles

These principles govern every design decision in the financial system:

1. **Ledger as Source of Truth** — No balance is changed directly. Every balance change is the result of an immutable ledger entry. Balances can always be recalculated from the ledger.

2. **Suborder-Level Granularity** — All financial operations (settlement, disputes, freezing, payouts) are scoped to the suborder, not the order.

3. **Kobo-First Arithmetic** — All amounts are stored and calculated in Kobo to eliminate floating-point errors.

4. **Explicit State Transitions** — Every financial state (pending, available, disputed) has a defined entry and exit condition. No implicit transitions.

5. **Student-First Protection** — In ambiguous or unresolved scenarios, the default outcome protects the student.

6. **Vendor Transparency** — Vendors always have visibility into their wallet state, including frozen funds and the reason for any hold.

---

## Core Components

The financial system is made up of five core components. Every other design decision is an extension or interaction of these five.

### 1. The Ledger
The single source of truth for all money movement on the platform. Every financial event is recorded here as an immutable entry. Nothing changes a balance directly — every balance change is the result of a ledger entry.

### 2. The Vendor Wallet
Tracks a vendor's running balance on the platform across four states: available, pending, disputed, and debt. It is not a real bank account — it is a calculated state maintained for fast balance reads.

### 3. The Platform Wallet
A singleton document that tracks the platform's accumulated revenue from commissions and penalties.

### 4. The Transaction Record
The bridge between Flutterwave and the internal system. Links an external payment reference to the internal suborder breakdowns, commission calculations, and fund allocations it triggered.

### 5. The Payout System
Responsible for moving money from the platform to a vendor's real bank account via Flutterwave's Transfer API. Every payout attempt is fully logged.

---

## Data Models

### Ledger Entry
```javascript
{
  _id: ObjectId,
  type: String,           // "CREDIT" or "DEBIT"
  category: String,       // See categories below
  amount: Number,         // Always in Kobo
  entityType: String,     // "VENDOR", "PLATFORM", "STUDENT"
  entityId: ObjectId,     // Reference to the affected entity
  referenceType: String,  // "SUBORDER", "DISPUTE", "PAYOUT", "PENALTY"
  referenceId: ObjectId,  // _id of the triggering document
  description: String,
  createdAt: Date,        // Set once, never updated
  metadata: Object        // Extra context e.g. Flutterwave reference
}
```

**Ledger Entry Categories:**

| Category | Description |
|----------|-------------|
| `PAYMENT_RECEIVED` | Student payment collected by platform |
| `COMMISSION_DEDUCTED` | Platform commission taken from suborder |
| `VENDOR_SETTLEMENT` | Vendor's net amount credited to wallet |
| `FUNDS_HELD` | Funds frozen due to open dispute |
| `FUNDS_RELEASED` | Frozen or pending funds released to available |
| `REFUND_ISSUED` | Funds returned to student |
| `PENALTY_APPLIED` | Penalty deducted from vendor wallet |
| `PAYOUT_INITIATED` | Vendor withdrawal request processed |
| `PAYOUT_COMPLETED` | Withdrawal successfully sent to bank |
| `PAYOUT_FAILED` | Withdrawal attempt failed |

---

### Vendor Wallet
```javascript
{
  _id: ObjectId,
  vendorId: ObjectId,
  balances: {
    available: Number,  // Funds vendor can withdraw right now (Kobo)
    pending: Number,    // Funds awaiting order confirmation (Kobo)
    disputed: Number,   // Funds frozen due to open disputes (Kobo)
    total: Number       // available + pending + disputed (Kobo)
  },
  debt: {
    amount: Number,             // Amount owed to platform (Kobo)
    recoveryType: String,       // "PERCENTAGE_DEDUCTION" or "FULL_BLOCK"
    recoveryPercentage: Number  // Only applicable if PERCENTAGE_DEDUCTION
  },
  currency: String,   // "NGN"
  updatedAt: Date,
  createdAt: Date
}
```

> **Note:** Balances are maintained as a running state updated alongside ledger entries. The ledger remains the source of truth for auditing; the wallet provides fast balance reads without expensive aggregation queries.

---

### Platform Wallet
```javascript
{
  _id: ObjectId,
  balances: {
    commission: Number,  // Revenue from commissions (Kobo)
    penalties: Number,   // Revenue from vendor penalties (Kobo)
    total: Number        // commission + penalties (Kobo)
  },
  currency: String,     // "NGN"
  updatedAt: Date,
  createdAt: Date
}
```

> **Note:** This is a singleton document. There is only ever one platform wallet.

---

### Transaction Record
```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  orderId: ObjectId,
  flutterwaveReference: String,
  flutterwaveStatus: String,    // "pending", "successful", "failed"
  totalAmount: Number,          // Total amount paid by student (Kobo)
  suborderBreakdowns: [
    {
      suborderId: ObjectId,
      vendorId: ObjectId,
      grossAmount: Number,      // What student paid for this suborder (Kobo)
      commission: Number,       // Platform's cut (Kobo)
      settleAmount: Number,     // Vendor's net amount (Kobo)
      commissionDetails: {
        percentageFee: Number,
        flatFeeApplied: Number
      },
      status: String            // See suborder statuses below
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Suborder Financial Statuses:**

| Status | Meaning |
|--------|---------|
| `PENDING` | Payment received, awaiting order confirmation |
| `HELD` | Funds frozen due to open dispute |
| `SETTLED` | Funds released to vendor's available balance |
| `DISPUTED` | Active dispute in progress |
| `REFUNDED` | Student has been refunded |

---

### Payout Record
```javascript
{
  _id: ObjectId,
  vendorId: ObjectId,
  amount: Number,               // Amount requested (Kobo)
  bankDetails: {
    bankCode: String,
    accountNumber: String,
    accountName: String
  },
  flutterwaveTransferId: String,
  flutterwaveStatus: String,    // "pending", "successful", "failed"
  status: String,               // "INITIATED", "PROCESSING", "COMPLETED", "FAILED"
  ledgerEntryId: ObjectId,
  failureReason: String,        // Populated if payout fails
  createdAt: Date,
  updatedAt: Date
}
```

---

### Dispute Record
```javascript
{
  _id: ObjectId,
  suborderId: ObjectId,
  orderId: ObjectId,
  studentId: ObjectId,
  vendorId: ObjectId,
  reason: String,               // Student's written description
  evidence: [String],           // Array of image URLs
  status: String,               // "OPEN", "AWAITING_EVIDENCE", "RESOLVED", "AUTO_RESOLVED"
  outcome: String,              // "UPHELD", "REJECTED", "INCONCLUSIVE" — null until resolved
  frozenAmount: Number,         // Amount frozen (Kobo)
  penaltyAmount: Number,        // Penalty applied if upheld — 0 otherwise (Kobo)
  openedAt: Date,
  warningIssuedAt: Date,        // When day 4 alert was sent to platform team
  resolvedAt: Date,
  deadline: Date,               // openedAt + 5 business days
  resolvedBy: String,           // "PLATFORM_TEAM" or "SYSTEM"
  resolutionNotes: String,
  additionalEvidenceRequestedAt: Date,
  additionalEvidenceDeadline: Date,   // additionalEvidenceRequestedAt + 48 hours
  additionalEvidence: [String],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Commission Structure

Commission is calculated per suborder using a tiered structure. All values are in Kobo.

| Transaction Range | Commission |
|-------------------|------------|
| ₦1 – ₦2,499 | 5% + ₦100 flat fee |
| ₦2,500 – ₦4,999 | 5% only |
| ₦5,000 and above | 5% + ₦200 flat fee |

The `calculateCommission(amountInKobo)` utility function handles this logic and returns:
- `commission` — total amount deducted
- `settleAmount` — vendor's net amount after deduction
- `details.percentageFee` — the raw 5% portion
- `details.flatFeeApplied` — the flat fee applied (0, ₦100, or ₦200 in Kobo)

> **Location:** `utils/commission.ts`

---

## Fund Flow Logic

### Stage 1: Student Payment Confirmed
*Triggered by Flutterwave webhook on successful payment*

1. Create **Transaction Record** with Flutterwave reference
2. Calculate suborder breakdown for every vendor using `calculateCommission`
3. For each suborder, create **Ledger Entries:**
   - `PAYMENT_RECEIVED` — platform holds gross amount
   - `COMMISSION_DEDUCTED` — platform wallet commission balance credited
   - `VENDOR_SETTLEMENT` — vendor wallet pending balance credited
4. Update each **Vendor Wallet** — add settle amount to `pending`
5. Update **Platform Wallet** — add commission to `commission` balance

**Vendor wallet state:**
```
available: 0
pending:   settleAmount  ← awaiting confirmation
disputed:  0
```

---

### Stage 2: Order Confirmed
*Triggered by student confirmation or auto-confirm after 3 days*

> Auto-confirm only fires if order status is "out for delivery" or "awaiting confirmation"

1. Create **Ledger Entry:** `FUNDS_RELEASED`
2. Update **Transaction Record** suborder status → `SETTLED`
3. Update **Vendor Wallet:**
   - Subtract from `pending`
   - Add to `available`

**Vendor wallet state:**
```
available: settleAmount  ← ready for withdrawal
pending:   0
disputed:  0
```

---

### Stage 3: Dispute Opened
*Triggered when student raises a dispute on a suborder*

> Requires detailed written description and photo evidence

1. Create **Dispute Record** with `status: "OPEN"` and deadline set to +5 business days
2. Create **Ledger Entry:** `FUNDS_HELD`
3. Update **Transaction Record** suborder status → `DISPUTED`
4. Update **Vendor Wallet:**
   - Subtract from `pending`
   - Add to `disputed`

**Vendor wallet state:**
```
available: 0
pending:   0
disputed:  settleAmount  ← frozen, visible to vendor
```

---

### Stage 4A: Dispute Upheld
*Triggered when platform team rules in favour of the student*

1. Create **Ledger Entries:**
   - `REFUND_ISSUED` — student refunded
   - `PENALTY_APPLIED` — penalty deducted from vendor
2. Update **Vendor Wallet:**
   - Subtract frozen amount from `disputed`
   - Subtract penalty from `available` (wallet may go negative)
   - If negative, set `debt` fields:
     - Below threshold → `recoveryType: "PERCENTAGE_DEDUCTION"`
     - Above threshold → `recoveryType: "FULL_BLOCK"`
3. Update **Platform Wallet** — add penalty to `penalties` balance
4. Update **Dispute Record** → `status: "RESOLVED"`, `outcome: "UPHELD"`
5. Update **Transaction Record** suborder status → `REFUNDED`

---

### Stage 4B: Dispute Rejected
*Triggered when platform team rules in favour of the vendor*

1. Create **Ledger Entry:** `FUNDS_RELEASED`
2. Update **Vendor Wallet:**
   - Subtract from `disputed`
   - Add to `available`
3. Update **Dispute Record** → `status: "RESOLVED"`, `outcome: "REJECTED"`
4. Update **Transaction Record** suborder status → `SETTLED`

---

### Stage 4C: Dispute Auto-Resolved
*Triggered by background job at day 5 if dispute remains unresolved*

Same financial flow as Stage 4A (Upheld), **except:**
- No penalty is applied to the vendor
- Dispute Record → `status: "AUTO_RESOLVED"`, `resolvedBy: "SYSTEM"`
- Vendor account flagged for review

> **Background job:** Sends a 24-hour warning alert to the platform team at day 4 before auto-resolution fires at day 5.

---

### Stage 4D: Dispute Inconclusive
*Triggered when platform team cannot make a clear judgment call*

1. Update **Dispute Record** → `status: "AWAITING_EVIDENCE"`
2. Set `additionalEvidenceDeadline` to +48 hours
3. Funds remain frozen — no wallet changes

**After 48 hours:**
- Student provides stronger evidence → case re-evaluated → flow goes to 4A or 4B
- Student fails to respond → funds released to vendor → flow goes to 4B

---

### Stage 5: Vendor Requests Payout
*Triggered when vendor initiates a withdrawal*

1. Check **Vendor Wallet** debt status:
   - `FULL_BLOCK` → reject payout, notify vendor
   - `PERCENTAGE_DEDUCTION` → deduct debt recovery portion first, process remainder
2. Create **Payout Record** → `status: "INITIATED"`
3. Create **Ledger Entry:** `PAYOUT_INITIATED` — debit available balance
4. Update **Vendor Wallet** — subtract payout amount from `available`
5. Initiate transfer via **Flutterwave Transfer API**

---

### Stage 6: Payout Outcome
*Triggered by Flutterwave webhook*

**If successful:**
1. Update **Payout Record** → `status: "COMPLETED"`
2. Create **Ledger Entry:** `PAYOUT_COMPLETED`

**If failed:**
1. Update **Payout Record** → `status: "FAILED"`, populate `failureReason`
2. Create **Ledger Entry:** `PAYOUT_FAILED`
3. Reverse wallet deduction — add amount back to `available`
4. Notify vendor of failure and reason

---

## Complete Fund Flow Diagram

```
Student Pays
    │
    ▼
[PAYMENT_RECEIVED] ──────────────────────────► Platform holds full amount
[COMMISSION_DEDUCTED] ───────────────────────► Platform wallet credited
[VENDOR_SETTLEMENT] ─────────────────────────► Vendor wallet: pending credited
    │
    ▼
Order Confirmed (Student or Auto-Confirm)
    │
    ├──── Dispute Opened ◄────────────────────── Student raises dispute
    │         │
    │         ▼
    │     [FUNDS_HELD] ───────────────────────► Vendor wallet: pending → disputed
    │         │
    │         ▼
    │     Resolution
    │         │
    │         ├── Upheld ──────────────────────► [REFUND_ISSUED] + [PENALTY_APPLIED]
    │         ├── Rejected ────────────────────► [FUNDS_RELEASED] disputed → available
    │         ├── Auto-Resolved ───────────────► [REFUND_ISSUED] (no penalty)
    │         └── Inconclusive ───────────────► Await evidence → Upheld or Rejected
    │
    ▼
[FUNDS_RELEASED] ────────────────────────────► Vendor wallet: pending → available
    │
    ▼
Vendor Requests Payout
    │
    ▼
[PAYOUT_INITIATED] ──────────────────────────► Available balance debited
    │
    ▼
Flutterwave Transfer API
    │
    ├── [PAYOUT_COMPLETED] ──────────────────► Transfer confirmed
    └── [PAYOUT_FAILED] ────────────────────► Balance reversed, vendor notified
```

---

## Dispute Policy

### Trigger & Evidence
- Raised by student with **detailed written description and photo evidence**
- Applicable dispute reasons:
  - Late delivery (objective — policy-led resolution)
  - Wrong or substandard products (subjective — human-led resolution)

### Fund Handling During Dispute
- Only the **disputed suborder's settle amount** is frozen
- All other vendor wallet funds remain fully accessible
- Vendor has full visibility into frozen funds and the reason

### Resolution Timeline

| Day | Event |
|-----|-------|
| Day 0 | Dispute opened |
| Day 4 | 24-hour warning alert sent to platform team |
| Day 5 | Auto-resolution fires if unresolved |

### Resolution Outcomes

| Outcome | Financial Result |
|---------|-----------------|
| Upheld | Student refunded + vendor penalized |
| Rejected | Frozen funds released to vendor |
| Auto-Resolved | Student refunded, no vendor penalty |
| Inconclusive | Additional evidence requested (48hr window) |

### Penalty & Debt Recovery

- Penalty is deducted from the vendor's wallet balance
- If insufficient balance, wallet goes negative (debt)
- Debt recovery is automatic:
  - **Small debt** (below defined threshold): fixed percentage deducted from future payouts
  - **Large debt** (above threshold): all payouts blocked until debt is cleared
- Vendor is notified of debt status and recovery method
- Penalty revenue is credited to the platform wallet

---

## Payout System

- Vendors can request payouts of their `available` balance at any time
- Payouts are processed via **Flutterwave's Transfer API**
- Payout is blocked or partially withheld if vendor has outstanding debt
- Failed payouts are automatically reversed — vendor's available balance is restored
- Every payout attempt (successful or failed) is fully logged in the Payout Record and Ledger

---

## Open Items & Future Considerations

### Defined — Pending Implementation
| Item | Decision |
|------|----------|
| Negative wallet recovery threshold | Threshold value in Kobo to be defined by business |
| Penalty amount structure | Fixed fine, percentage, or strike-based system to be defined |
| Payout scheduling | Manual on-demand vs. automated scheduled disbursements |

### Planned Future Features
| Feature | Notes |
|---------|-------|
| Subscription model | Additional revenue stream for vendors — financial system to be extended |
| Digital products | Instant delivery removes confirmation gap — simpler fund release logic |
| Automated payout scheduling | Scheduled disbursements on fixed cycles (e.g. weekly NET-7) |
| CBN compliance review | As transaction volume grows, platform may need to assess payment service licensing |

---

*This document should be updated whenever a financial policy, data model, or fund flow logic changes. Never let implementation diverge silently from this document.*

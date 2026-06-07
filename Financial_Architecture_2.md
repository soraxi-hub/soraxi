# Soraxi Financial System Architecture (Payouts, Ledger, Wallets)

## Overview

This document describes the complete financial architecture of the Soraxi marketplace system, including:

- Vendor payout processing
- Debt recovery mechanism
- Processing fees
- Gateway (Flutterwave) fees
- Platform wallet accounting
- Ledger-based immutable financial tracking

The system is designed to be **audit-safe, immutable, and double-entry friendly**, ensuring every naira movement is traceable.

---

# 1. Core Financial Principles

## 1.1 Ledger is the Source of Truth

All financial events are recorded in the **ledger system**.

- Ledger entries are immutable (never updated or deleted)
- Every wallet balance is derived from ledger activity
- Every transaction must have at least one ledger entry

---

## 1.2 Wallets are Derived Views

Wallets (Vendor, Platform, etc.) are **not the source of truth**.

They represent:

- Cached balances
- Aggregated ledger results
- Performance optimization layer

---

## 1.3 All Amounts are Stored in Kobo

To prevent floating-point precision issues:

```
1 Naira = 100 Kobo
```

---

# 2. Vendor Payout Flow

## Step 1: Input

Vendor requests withdrawal:

```
input.amount = requestedAmount
```

---

## Step 2: Debt Recovery Calculation

If vendor has outstanding debt:

```ts
calculateDebtRecoveryDeduction();
```

Outputs:

- recoveryDeduction
- netPayoutAmount (after debt recovery)

### Rule:

Debt recovery is applied BEFORE fees.

---

## Step 3: Processing Fee Calculation

```ts
calculateWithdrawalFees(netPayoutAmount);
```

Outputs:

- fixedFee
- percentageFee
- totalFee

### Rule:

Processing fee is platform revenue.

---

## Step 4: Gateway Fee Calculation (Flutterwave)

```ts
calculateGatewayFee(netAmount);
```

Outputs:

- transferFee
- VAT
- total gateway fee

### Rule:

Gateway fee is a **platform expense**, not deducted from vendor payout.

---

## Step 5: Final Transfer Amount

```
finalTransferAmount = netPayoutAmount - processingFee
```

This is what is sent to Flutterwave.

---

# 3. Money Flow Breakdown

Given:

```
Requested: ₦100,000
Debt Recovery: ₦10,000
Processing Fee: ₦1,000
Gateway Fee: ₦53.75
```

### Breakdown:

### Vendor Wallet

- Deducted: ₦100,000

### Allocation:

- ₦10,000 → Debt Recovery
- ₦1,000 → Platform Revenue
- ₦89,000 → Payout Transfer

### Platform Expense:

- ₦53.75 → Flutterwave Fee

---

# 4. Ledger Architecture

## 4.1 Ledger Entry Structure

Each ledger entry includes:

- type (CREDIT / DEBIT)
- category (financial event type)
- amount (in Kobo)
- entityType (vendor/platform/customer)
- entityId
- referenceType (payout/suborder/dispute)
- referenceId
- description
- metadata

---

## 4.2 Key Ledger Categories

### Revenue

- PAYMENT_RECEIVED
- COMMISSION_DEDUCTED
- PENALTY_APPLIED

### Payout

- PAYOUT_INITIATED
- PAYOUT_COMPLETED
- PAYOUT_FAILED

### Recovery & Fees

- DEBT_RECOVERED (NEW)
- GATEWAY_FEE_DEDUCTED (NEW)

---

# 5. Platform Wallet Design

## 5.1 Purpose

The platform wallet tracks:

- Commission revenue
- Penalty revenue
- Total platform earnings

---

## 5.2 Structure

```ts
balances: {
  commission: number;
  penalties: number;
  total: number;
}
```

---

## 5.3 Excluded

The platform wallet does NOT store:

- Gateway fees
- Transfer earnings
- Operational expenses

These are tracked via ledger only.

---

# 6. Gateway Fee Handling (Flutterwave)

## 6.1 Fee Structure

```
≤ ₦5,000 → ₦10
₦5,001 - ₦50,000 → ₦25
> ₦50,000 → ₦50
+ 7.5% VAT
```

---

## 6.2 Accounting Rule

Gateway fees:

- Are paid by the platform
- Are NOT deducted from vendor payout
- Are recorded as platform expense

---

## 6.3 Ledger Entry

```ts
category: GATEWAY_FEE_DEDUCTED;
type: DEBIT;
entityType: PLATFORM;
```

---

# 7. Debt Recovery System

## 7.1 Purpose

To recover outstanding vendor debt gradually through payouts.

---

## 7.2 Strategy

### Percentage Deduction

A percentage of each payout is used to reduce debt.

---

## 7.3 Ledger Impact

- DEBT_RECOVERED (CREDIT to platform or adjustment entry)
- Vendor wallet reduced accordingly

---

# 8. Payout Transaction Lifecycle

## Step 1: INITIATED

- Ledger entry created
- Vendor wallet debited (full requested amount)
- Payout record created

---

## Step 2: PROCESSING

- Sent to Flutterwave

---

## Step 3: COMPLETED

- Status updated
- Ledger updated

---

## Step 4: FAILED

- Wallet reversal occurs
- Ledger reversal entries created

---

# 9. Payout Record Breakdown

Stored snapshot includes:

- requestedAmount
- debtRecoveryDeductionAmount
- debtBeforeRecovery
- debtAfterRecovery
- debtRecoveryPercentage
- fixedProcessingFee
- percentageProcessingFee
- processingFee
- gatewayFee
- netAmount

---

# 10. Key Design Decisions

## 10.1 Why full requested amount is deducted

Ensures:

- Wallet consistency
- Audit correctness
- No hidden liabilities

---

## 10.2 Why gateway fee is NOT in wallet

Because:

- It is operational expense
- It belongs to infrastructure cost
- It is independent of vendor transaction logic

---

## 10.3 Why ledger is immutable

Guarantees:

- Financial audit safety
- Fraud prevention
- Historical reconstruction

---

# 11. System Summary

### Vendor Side

- Requests payout
- Wallet debited full amount

### Platform Side

- Earns commission
- Applies debt recovery
- Pays Flutterwave fee

### Gateway Side

- Processes transfer
- Charges platform separately

---

# 12. Final Architecture Model

```
Vendor Wallet
    ↓
Ledger (immutable truth)
    ↓
Platform Processing Layer
    ↓
Flutterwave Transfer (net amount)
    ↓
Gateway Fee → Platform Expense
```

---

# End of Document

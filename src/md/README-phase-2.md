# Phase 2: Risk Management & Dispute Handling

## Overview

Phase 2 adds three critical systems:

1. **Dispute & Chargeback Management** - Handle customer disputes, chargebacks, and refunds
2. **Risk Evaluation** - Score orders and flag high-risk transactions
3. **Seller Tier System** - Automatic seller progression based on performance

## Models

### DisputeCase

Tracks customer disputes, chargebacks, and resolution process.

- Types: Chargeback, Customer Complaint, Return Request, Quality Issue, Fraud Report
- Statuses: Open → Under Investigation → Resolved
- Handles fund reversal when buyer wins

### SellerTier

Tracks seller performance and marketplace tier.

- Tiers: NEW → TRUSTED → VERIFIED → PREMIUM
- Determines fund release timelines and order limits
- Automatic promotion based on metrics

### RiskIndicator

Evaluates order risk before processing.

- Scores from 0-100 across multiple factors
- Triggers actions: None, Monitor, Review, Hold, Request Verification, Block

## Integration with Phase 1

### Fund Release Adjustments

When **Risk Assessment** triggers:

1. Order flagged during payment processing
2. Risk score calculated before FundRelease created
3. High-risk orders get extended hold duration
4. Fund release timeline adjusted: `targetReleaseDate += extendedHoldDuration`

### When **Dispute** Opens:

1. Existing FundRelease frozen
2. If funds already released, reversed to pending
3. FundRelease status: DISPUTE_FROZEN
4. Funds locked during investigation (max 30 days)

### When **Seller Tier** Changes:

1. FundReleaseTimeline updated automatically
2. New orders use new tier benefits
3. Old pending releases keep original terms (grandfathered)

## Timeline Example

\`\`\`
Seller: NEW → 72-hour hold
Seller: TRUSTED → 48-hour hold  
Seller: VERIFIED → 24-hour hold
Seller: PREMIUM → 12-hour hold

Order placed: Day 0, 10:00 AM
NEW seller: Release Day 3, 10:00 AM
If HIGH risk flag: Release Day 4, 10:00 AM (+ 24 hours)
If CRITICAL risk: Release Day 10, 10:00 AM (+ 7 days)
If DISPUTE opens: FROZEN until resolved (+ 30 days max)
\`\`\`

## Implementation Flow

### Risk Evaluation (At Payment)

\`\`\`
Order received
↓
evaluateOrderRisk(seller, order, buyer)
├ Check seller tier/history
├ Check buyer history
├ Check order amount
└ Calculate risk score
↓
If HIGH/CRITICAL: requiresApproval = true
↓
createFundRelease() with adjusted timeline
\`\`\`

### Dispute Resolution

\`\`\`
Dispute opened
↓
freezeFundsOnDispute()
├ Stop fund release
└ Reverse if already released
↓
Investigation (48 hrs seller response deadline)
↓
Resolve in favor of buyer/seller
├ If buyer: Issue refund, debit seller
└ If seller: Release frozen funds
\`\`\`

### Seller Tier Advancement

\`\`\`
Order completed + 7 days (return window)
↓
evaluatePromotionEligibility(seller)
├ Check days active
├ Check order count
├ Check rating
├ Check chargeback rate
└ Check dispute rate
↓
If eligible: promoteSeller()
└ Update timeline, limits, requirements
↓
Next order uses new benefits

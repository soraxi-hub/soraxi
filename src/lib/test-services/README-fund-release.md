# Fund Release System - Phase 1

This system manages when and how funds move from escrow to seller wallets in your marketplace.

## Architecture

### Models
- **FundRelease** - Tracks each fund release instance with conditions and status

### Services
- **fund-release-logic.ts** - Business rules and calculations
- **fund-release-service.ts** - CRUD operations and state transitions

## Key Concepts

### Seller Tiers
Based on verification status and performance metrics:
- **New**: 7 business days hold
- **Trusted**: 3 business days hold (20+ reviews, 4.5+ rating)
- **Established**: 1 business day hold (100+ reviews, 4.7+ rating)
- **Unverified**: 30 days hold (maximum protection)

### Release Conditions
All must be true before funds release:
1. ✅ Payment cleared
2. ✅ Store verification complete
3. ✅ Delivery confirmed by customer (or auto-confirmed after 3 days)
4. ✅ Buyer protection period expired
5. ✅ No active disputes
6. ✅ No active returns
7. ✅ No chargebacks

### Fund Release Status Flow
\`\`\`
Pending (order placed)
  ↓
Ready (all conditions met)
  ↓
Processing (funds being transferred)
  ↓
Released (funds in seller wallet)

Note: Any status can → Failed or Reversed (on disputes/chargebacks)
\`\`\`

## Integration Points

### When Order is Placed
\`\`\`typescript
// Create fund release record
await createFundRelease(store, order, subOrder, amount, commission);
\`\`\`

### When Payment Clears
\`\`\`typescript
// Update condition
await updateFundReleaseCondition(fundReleaseId, "paymentCleared", true);
\`\`\`

### When Delivery Confirmed
\`\`\`typescript
// Update condition
await updateFundReleaseCondition(fundReleaseId, "deliveryConfirmed", true);
\`\`\`

### Scheduled Job (runs daily/hourly)
\`\`\`typescript
// Check all pending releases, transition ready ones
await checkAndTransitionFundReleases();

// Then process ready releases
const readyReleases = await getFundReleasesReadyToRelease();
for (const release of readyReleases) {
  await processFundRelease(release._id);
}
\`\`\`

## Next Steps (Phase 2)

- [ ] Add risk indicator detection
- [ ] Implement dispute/chargeback handling
- [ ] Add seller tier system to Store model
- [ ] Create admin dashboard to view fund releases
- [ ] Add webhook for payment gateway updates
- [ ] Create scheduled job handler

## Next Steps (Phase 3)

- [ ] Return window logic
- [ ] Tax/1099 reporting
- [ ] Regulatory holds by region
- [ ] Commission recalculation on returns

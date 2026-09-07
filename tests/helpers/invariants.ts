import { expect } from "vitest";
import {
  checkGlobalBalance,
  verifyJournalEntryIntegrity,
  checkLedgerStructuralIntegrity,
  checkLedgerAccountingIdentity,
  checkEscrowSolvency,
  reconcileVendorWallet,
  reconcileVendorDebt,
  reconcilePlatformWallet,
  type EscrowSolvencyResult,
} from "@/lib/utils/reconciliation.util";

/**
 * The full battery of system-wide ledger invariants. Run after EVERY stage of
 * a lifecycle scenario — a stage that leaves any of these broken has written
 * a malformed entry, regardless of whether its own assertions passed.
 *
 * Duplicate journal groups are deliberately NOT asserted here: some categories
 * legitimately repeat for one reference (e.g. PAYOUT_FAILED is written by the
 * payout reversal, the processing-fee reversal, and the gateway-fee reversal,
 * all referencing the same payoutId).
 */
export async function expectLedgerHealthy(): Promise<void> {
  const global = await checkGlobalBalance();
  expect(global, "global credits === debits").toMatchObject({
    isBalanced: true,
    delta: 0,
  });

  const broken = await verifyJournalEntryIntegrity();
  expect(broken, "no unbalanced/malformed journal entries").toEqual([]);

  const structural = await checkLedgerStructuralIntegrity();
  expect(structural.orphanedLines, "no orphaned ledger lines").toEqual([]);
  expect(
    structural.malformedEntityLines,
    "no VENDOR_*/CUSTOMER_* lines missing entityId/entityType",
  ).toEqual([]);
  // Now that a "duplicate" means the same movement written twice — rather than
  // merely several entries sharing a category — this is safe to assert on
  // every scenario, and catches a double-write wherever one occurs.
  expect(
    structural.duplicateJournalGroups,
    "no journal entry written twice",
  ).toEqual([]);

  const identity = await checkLedgerAccountingIdentity();
  expect(
    identity,
    `accounting identity: assets − liabilities === retained earnings ` +
      `(components: ${JSON.stringify(identity.components)})`,
  ).toMatchObject({ isBalanced: true, delta: 0 });
}

/**
 * Assert the vendor's wallet cache (balances AND debt) exactly matches what
 * the ledger derives. This is the only check capable of catching a
 * wrong-direction ledger line — a line crediting the wrong account still
 * balances globally.
 */
export async function expectVendorReconciled(vendorId: string): Promise<void> {
  const wallet = await reconcileVendorWallet(vendorId);
  expect(
    wallet.discrepancies,
    `vendor ${vendorId} wallet cache matches ledger ` +
      `(stored: ${JSON.stringify(wallet.stored)}, derived: ${JSON.stringify(wallet.derived)})`,
  ).toEqual({});
  expect(wallet.isBalanced).toBe(true);

  const debt = await reconcileVendorDebt(vendorId);
  expect(
    debt.derived,
    `vendor ${vendorId} debt cache (${debt.stored}) matches ledger`,
  ).toBe(debt.stored);
  expect(debt.isBalanced).toBe(true);
}

/** Assert the platform wallet cache matches the ledger's revenue accounts. */
export async function expectPlatformReconciled(): Promise<void> {
  const result = await reconcilePlatformWallet();
  expect(
    result.discrepancies,
    `platform wallet cache matches ledger ` +
      `(stored: ${JSON.stringify(result.stored)}, derived: ${JSON.stringify(result.derived)})`,
  ).toEqual({});
  expect(result.isBalanced).toBe(true);
}

/** Assert solvency and return the full result for stage-specific assertions. */
export async function expectSolvent(): Promise<EscrowSolvencyResult> {
  const solvency = await checkEscrowSolvency();
  expect(
    solvency.isSolvent,
    `platform-held cash (${solvency.platformHeldCash}) covers liabilities ` +
      `(${solvency.liabilities.total})`,
  ).toBe(true);
  return solvency;
}

/**
 * Convenience: the complete post-stage check — system-wide invariants,
 * per-vendor reconciliation for every vendor in the scenario, platform
 * wallet reconciliation, and solvency.
 */
export async function expectSystemConsistent(
  vendorIds: string[],
): Promise<EscrowSolvencyResult> {
  await expectLedgerHealthy();
  for (const vendorId of vendorIds) {
    await expectVendorReconciled(vendorId);
  }
  await expectPlatformReconciled();
  return expectSolvent();
}

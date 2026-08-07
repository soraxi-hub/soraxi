import {
  DeliveryProofMethodEnum,
  DeliveryProofStrengthEnum,
} from "@/enums";
import type { IDeliveryProof } from "@/lib/db/models/order.model";
import { MAX_DELIVERY_CODE_ATTEMPTS } from "@/constants/delivery";

/**
 * Audience-specific projections of a sub-order's delivery proof.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * `IDeliveryProof` holds two secrets meant for two different people, and the
 * order projections used to spread the sub-order wholesale. That would have
 * sent the **code to the vendor** — who could then confirm their own delivery
 * and collect payment on goods never handed over, defeating the entire
 * mechanism — and the **token to the customer**.
 *
 * Nothing may spread `deliveryProof` directly. Everything goes through one of
 * the functions below, each an explicit allow-list. A new field added to the
 * model stays invisible until someone deliberately projects it.
 */

/** What the customer sees: their code, and how delivery was proven. Never the token. */
export interface CustomerDeliveryProofView {
  /** The 6-digit code. Shown only while it is still usable. */
  code?: string;
  method?: DeliveryProofMethodEnum;
  confirmedAt?: Date;
  /** Who typed the code, as they identified themselves. Unverified. */
  riderName?: string;
  /** True once delivery is established by any route. */
  isConfirmed: boolean;
  /**
   * True when the vendor declared delivery with nothing to back it. Drives the
   * customer's "No proof" badge and the prompt to confirm or report a problem.
   */
  isUnproven: boolean;
}

/** What the vendor sees: the link and its state. Never the code. */
export interface VendorDeliveryProofView {
  /** Present only while a live link exists. */
  token?: string;
  tokenExpiresAt?: Date;
  attemptsUsed: number;
  attemptsRemaining: number;
  isLocked: boolean;
  method?: DeliveryProofMethodEnum;
  confirmedAt?: Date;
  riderName?: string;
  isConfirmed: boolean;
}

/** What an admin sees when resolving a dispute. Neither secret. */
export interface AdminDeliveryProofView {
  method?: DeliveryProofMethodEnum;
  strength: DeliveryProofStrengthEnum;
  confirmedAt?: Date;
  riderName?: string;
  isConfirmed: boolean;
}

/** How much weight an admin should give a proof method. */
export function proofStrength(
  method?: DeliveryProofMethodEnum,
): DeliveryProofStrengthEnum {
  switch (method) {
    case DeliveryProofMethodEnum.CustomerInApp:
      // First-party: the buyer's own authenticated account said so.
      return DeliveryProofStrengthEnum.Strongest;
    case DeliveryProofMethodEnum.CodeByRider:
    case DeliveryProofMethodEnum.CodeByVendor:
      // Buyer-attested: only the buyer had the code to release.
      return DeliveryProofStrengthEnum.Strong;
    default:
      // Vendor's word, or nothing at all.
      return DeliveryProofStrengthEnum.Weak;
  }
}

export function toCustomerProofView(
  proof: IDeliveryProof | undefined,
  isDelivered: boolean,
): CustomerDeliveryProofView {
  const method = proof?.method;
  const isConfirmed = Boolean(proof?.confirmedAt);

  return {
    // The code is withheld once it has served its purpose. Leaving a spent code
    // on screen invites someone to read it out for an unrelated delivery.
    code: isConfirmed ? undefined : proof?.code,
    method,
    confirmedAt: proof?.confirmedAt,
    riderName: proof?.riderName,
    isConfirmed,
    isUnproven:
      isDelivered && method === DeliveryProofMethodEnum.VendorDeclared,
  };
}

export function toVendorProofView(
  proof: IDeliveryProof | undefined,
): VendorDeliveryProofView {
  const attemptsUsed = proof?.attempts ?? 0;

  return {
    token: proof?.token,
    tokenExpiresAt: proof?.tokenExpiresAt,
    attemptsUsed,
    attemptsRemaining: Math.max(0, MAX_DELIVERY_CODE_ATTEMPTS - attemptsUsed),
    isLocked: Boolean(proof?.lockedAt),
    method: proof?.method,
    confirmedAt: proof?.confirmedAt,
    riderName: proof?.riderName,
    isConfirmed: Boolean(proof?.confirmedAt),
  };
}

export function toAdminProofView(
  proof: IDeliveryProof | undefined,
): AdminDeliveryProofView {
  return {
    method: proof?.method,
    strength: proofStrength(proof?.method),
    confirmedAt: proof?.confirmedAt,
    riderName: proof?.riderName,
    isConfirmed: Boolean(proof?.confirmedAt),
  };
}

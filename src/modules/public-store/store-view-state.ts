import { StoreStatusEnum } from "@/enums";

/**
 * The four states a public storefront can present.
 *
 * The URL is always `/brand/[storeId]` — visitors arrive from shared links and
 * search results regardless of what has happened to the store since. Rather
 * than redirecting, the page resolves one of these states and renders the
 * matching variant of the same shell.
 *
 * - `active`    — live store with at least one publicly visible product
 * - `empty`     — live store that has not published any products yet
 * - `pending`   — awaiting approval; catalogue is withheld until verified
 * - `suspended` — suspended or rejected; catalogue is withheld
 */
export type StoreViewState = "active" | "empty" | "pending" | "suspended";

/**
 * Resolves the storefront state from the store's moderation status and how
 * many publicly visible products it has.
 *
 * `productCount` must be the count of products that actually reach the page
 * (verified only — see `ProductRepository.findByIds`), not `physicalProducts`
 * on the store document. An active store whose products are all still awaiting
 * verification is legitimately `empty` to a visitor.
 *
 * `rejected` collapses into `suspended`: both mean "this store is not trading",
 * and a visitor has no business learning which of the two applies.
 */
export function resolveStoreViewState(
  status: StoreStatusEnum,
  productCount: number,
): StoreViewState {
  switch (status) {
    case StoreStatusEnum.Active:
      return productCount > 0 ? "active" : "empty";
    case StoreStatusEnum.Pending:
      return "pending";
    case StoreStatusEnum.Suspended:
    case StoreStatusEnum.Rejected:
      return "suspended";
    default:
      // Unknown status is treated as not-trading rather than falling open.
      return "suspended";
  }
}

/**
 * Whether a state is allowed to expose the store's catalogue.
 *
 * Used server-side to decide whether products are put in the response at all,
 * so a withheld catalogue is never sitting in the payload for anyone who opens
 * devtools.
 */
export function stateExposesProducts(state: StoreViewState): boolean {
  return state === "active" || state === "empty";
}

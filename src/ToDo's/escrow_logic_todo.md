# 🧾 TODO

### 4. Use PascalCase for Mongoose model and schema names

## -### 5. Resolve this issue: https://f63c812ac2b5.ngrok-free.app/checkout/success?trxref=Soraxi3735a119-69e9-4550-9a41-0d0c8807176d&reference=Soraxi3735a119-69e9-4550-9a41-0d0c8807176d

-- why the is no status attached to the url thereby, making the succes page to malfunction
+### 5. Checkout success redirect: verify server‑side and render status

- +Example (placeholder): +https://example.com/checkout/success?reference={tx_ref}
- +- Do not expose live/internal URLs or real transaction IDs in docs.
  +- Don’t rely on a `status` query param. On page load, read `reference` and call the backend:
- 1.  Backend verifies with the PSP using `reference`.
- 2.  Return canonical status (success | pending | failed) and amounts.
- 3.  Render the appropriate UI; handle pending gracefully.
      +- Implement idempotent verification and a webhook listener to reconcile delayed notifications.

⚠️ Potential issue | 🔴 Critical

🧩 Analysis chain

Filter out suspended‐store products in getByUserId
In src/modules/server/wishlist/procedures.ts the getByUserId query currently returns all products on a user’s wishlist without excluding those from suspended stores. Add a filter—similar to your home-page and search queries—to exclude any product whose merchant/store is suspended before mapping and returning the list.

In src/modules/server/wishlist/procedures.ts around the getByUserId query, the
current DB query returns wishlist products from suspended merchants; modify the
query to filter out products whose merchant/store is suspended (e.g., add a
join/where checking merchant.suspended = false or equivalent flag used
elsewhere) before mapping and returning results so suspended-store products are
excluded in the returned list.

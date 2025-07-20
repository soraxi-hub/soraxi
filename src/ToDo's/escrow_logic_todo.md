# 🧾 TODO: Escrow Logic for Order System

## 🧠 Escrow Logic to Implement

### 1. When `deliveryStatus` becomes `"Delivered"`

```ts
subOrder.returnWindow = now + 7 days;
```

- Set the return window countdown.
- Should be triggered when delivery is marked as "Delivered".

---

### 2. In a daily cron job (or background worker)

```ts
if (
  !subOrder.escrow.released &&
  Date.now() > subOrder.returnWindow &&
  subOrder.deliveryStatus === "Delivered"
) {
  releaseFundsToSellerWallet(subOrder);
  subOrder.escrow.released = true;
  subOrder.escrow.held = false;
  subOrder.escrow.releasedAt = new Date();
}
```

- Release funds only if:
  - Not already released
  - Delivery is complete
  - Return window has expired

---

### 3. If the sub-order is `"Returned"` and return is approved

```ts
refundBuyer(subOrder);
subOrder.escrow.held = false;
subOrder.escrow.released = false;
subOrder.escrow.refunded = true;
```

- Buyer is refunded.
- Escrow is closed (no funds held or released to seller).

---

### 4. Use PascalCase for Mongoose model and schema names

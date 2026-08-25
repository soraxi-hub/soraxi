# Cron Schedule Guide

Cron expressions are used to schedule jobs at specific times.

## Cron Expression Format

```text
┌──────── minute (0 - 59)
│ ┌────── hour (0 - 23)
│ │ ┌──── day of month (1 - 31)
│ │ │ ┌── month (1 - 12)
│ │ │ │ ┌─ day of week (0 - 7)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Field Meanings

| Field        | Description          | Allowed Values          |
| ------------ | -------------------- | ----------------------- |
| Minute       | Minute of the hour   | 0 - 59                  |
| Hour         | Hour of the day      | 0 - 23                  |
| Day of Month | Day within the month | 1 - 31                  |
| Month        | Month of the year    | 1 - 12                  |
| Day of Week  | Day of the week      | 0 - 7 (Sunday = 0 or 7) |

## Running Jobs Once Per Day

To run a cron job once per day, specify a fixed hour instead of using an interval such as `*/6`.

### Current Configuration

The live schedule lives in `vercel.json` at the repo root. That file is the
source of truth — this document explains it, but never overrides it.

```json
{
  "crons": [
    { "path": "/api/cron/auto-confirm-orders", "schedule": "0 1 * * *" },
    { "path": "/api/cron/auto-resolve-disputes", "schedule": "0 2 * * *" },
    { "path": "/api/cron/expire-dispute-evidence", "schedule": "0 3 * * *" },
    { "path": "/api/cron/sweep-pending-payments", "schedule": "0 14 * * *" },
    { "path": "/api/cron/reconcile-financials", "schedule": "0 3 * * *" },
    { "path": "/api/cron/reconcile-vendor-wallets", "schedule": "30 3 * * *" },
    { "path": "/api/cron/drain-message-outbox", "schedule": "0 11 * * *" }
  ]
}
```

## Execution Times

| Job                      | Time (UTC) | What it does                                                             |
| ------------------------ | ---------- | ------------------------------------------------------------------------ |
| auto-confirm-orders      | 01:00      | Auto-confirms deliveries left unconfirmed for 3 days (Stage 2 fund flow) |
| auto-resolve-disputes    | 02:00      | Auto-resolves disputes still open at day 5, in the student's favour      |
| expire-dispute-evidence  | 03:00      | Closes disputes whose 48-hour additional-evidence window elapsed         |
| reconcile-financials     | 03:00      | System-wide ledger integrity + per-gateway collections check             |
| reconcile-vendor-wallets | 03:30      | Per-vendor wallet and debt reconciliation against the ledger             |
| drain-message-outbox     | 11:00      | Flushes queued in-app message notifications                              |
| sweep-pending-payments   | 14:00      | Re-verifies orders still Pending; expires abandoned and stuck checkouts  |

> **Note — 03:00 collision.** `expire-dispute-evidence` and
> `reconcile-financials` are scheduled at the same minute. They touch different
> collections and neither holds long transactions, so this is tolerable today,
> but reconciliation reads ledger state that dispute expiry can write. If
> reconciliation ever reports a transient discrepancy at exactly 03:00, this
> overlap is the first thing to suspect — move one of them rather than
> investigating the ledger.

> **Note — `process-payouts` is not scheduled.** The route still exists at
> `/api/cron/process-payouts`, but it is deliberately absent from `vercel.json`:
> Flutterwave's Transfer API requires IP whitelisting and Vercel has no static
> egress IP, so payouts run through the manual admin path instead (see
> FINANCIAL_ARCHITECTURE.md §13). Re-add the entry once that constraint is
> resolved.

## Choosing a Schedule

Two of these jobs are **backstops** rather than primary paths, and their cadence
should be read that way:

- `reconcile-*` jobs detect drift; they do not prevent it. Running them more
  often narrows the window in which a discrepancy goes unnoticed, at the cost of
  repeated full-collection aggregations.

## Vercel Timezone Note

Vercel cron jobs are executed using **UTC**.

If you are located in **Nigeria (WAT, UTC+1)**, the equivalent local execution times are:

| UTC Time | Nigeria Time (WAT) |
| -------- | ------------------ |
| 01:00    | 02:00 AM           |
| 02:00    | 03:00 AM           |
| 03:00    | 04:00 AM           |
| 03:30    | 04:30 AM           |
| 11:00    | 12:00 PM           |
| 14:00    | 03:00 PM           |

## Example

The expression:

```text
0 8 * * *
```

means:

- Minute: `0`
- Hour: `8`
- Every day of the month
- Every month
- Every day of the week

Result: **Runs once every day at 08:00 UTC (09:00 AM WAT).**

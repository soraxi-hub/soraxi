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

### Example Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-confirm-orders",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cron/auto-resolve-disputes",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/expire-dispute-evidence",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/process-payouts",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Execution Times

| Job                     | Time (UTC) |
| ----------------------- | ---------- |
| auto-confirm-orders     | 01:00      |
| auto-resolve-disputes   | 02:00      |
| expire-dispute-evidence | 03:00      |
| process-payouts         | 08:00      |

## Vercel Timezone Note

Vercel cron jobs are executed using **UTC**.

If you are located in **Nigeria (WAT, UTC+1)**, the equivalent local execution times are:

| UTC Time | Nigeria Time (WAT) |
| -------- | ------------------ |
| 01:00    | 02:00 AM           |
| 02:00    | 03:00 AM           |
| 03:00    | 04:00 AM           |
| 08:00    | 09:00 AM           |

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

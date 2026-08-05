# Soraxi In-App Messaging — Architecture Documentation

> **Platform:** Soraxi Marketplace
> **Last Updated:** August 2026
> **Audience:** Internal developers and new team members
> **Status:** Living document — update as the system evolves

---

## Table of Contents

1. [Overview](#1-overview)
2. [Why It Is Built This Way](#2-why-it-is-built-this-way)
3. [The Three Boundaries](#3-the-three-boundaries)
4. [Data Models](#4-data-models)
5. [The Write Path](#5-the-write-path)
6. [The Outbox and Event Bus](#6-the-outbox-and-event-bus)
7. [System Notices](#7-system-notices)
8. [The Read Path](#8-the-read-path)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Moderation](#10-moderation)
11. [Store Suspension Semantics](#11-store-suspension-semantics)
12. [Privacy, Retention and Deletion](#12-privacy-retention-and-deletion)
13. [Rate Limits and Tunables](#13-rate-limits-and-tunables)
14. [File Inventory](#14-file-inventory)
15. [How To Extend It](#15-how-to-extend-it)
16. [Testing and Verification](#16-testing-and-verification)
17. [Known Gaps and Future Work](#17-known-gaps-and-future-work)

---

## 1. Overview

In-app messaging lets a student and a vendor talk to each other inside Soraxi,
in a thread attached to **the thing they are talking about** — either a product
(a pre-purchase enquiry) or a sub-order (a question about something already
bought).

**Stack:** Next.js App Router · MongoDB/Mongoose · tRPC · TanStack Query ·
Vercel serverless + Vercel Cron.

**Entry points for users:**

| Where | Action | Result |
|---|---|---|
| Product detail page | "Ask about this product" | Opens/reuses a product-scoped thread |
| Customer order page (per sub-order) | "Message vendor" | Opens/reuses an order-scoped thread |
| `/messages` | Customer inbox | Two-pane on desktop, single-pane on mobile |
| `/store/[store_id]/messages` | Vendor inbox | Same UI, vendor role |
| `/admin/moderation` | Moderator queue | Flagged conversations only |

**Thread identity:** one thread per `(customer, store, scope.refId)`. Asking
about the same product twice reuses the existing thread rather than creating a
second one. Thread creation is idempotent.

**Who may start what:** customers open product threads. Either side may open an
order thread — a vendor chasing a delivery detail has a legitimate reason to
make contact, whereas a vendor cold-messaging a browsing user is spam.

---

## 2. Why It Is Built This Way

Two constraints shaped every decision. Read this section before changing
anything structural.

### 2.1 Vercel serverless means no WebSockets

Nothing in this codebase can hold a persistent connection open. A Next.js route
handler on Vercel is a function invocation, not a long-lived process. There is
therefore **no socket server, and no in-process job queue** — anything that
must survive the response has to be persisted.

Delivery is **polling**, and that is a deliberate choice rather than a
limitation we regret. Vendor replies on a campus marketplace arrive in minutes,
not milliseconds. Polling costs nothing extra, works today, and — because
transport is isolated behind an interface (§9.1) — can be swapped for Pusher or
Ably later by editing one file.

### 2.2 A vendor is also a user

`src/trpc/init.ts` resolves three independent identities from three separate
cookies:

```ts
const user  = await getUserFromCookie();
const store = await getStoreFromCookie();
const admin = await getAdminFromCookie();
```

A single `userId` column would have been ambiguous from day one. Every actor in
messaging is therefore a **`(kind, id)` pair**, never a bare id. This also means
an admin can be added to a thread for dispute mediation later with no schema
change — `admin` is already a valid participant kind.

---

## 3. The Three Boundaries

These are the load-bearing parts of the design. Everything else is ordinary
CRUD and can be changed freely.

### 3.1 Messaging never reads the rest of the domain

Messaging touches products, orders, users and stores **only at write time** —
when a thread is created or a reference attached — and copies what it needs in
as a **snapshot**. Every read afterwards renders from messaging's own
collections.

```
   product page ─┐
   order page  ──┼──► openThread(scope) ──► [ MESSAGING ]
   admin       ──┘      (one-way, write only)   conversations
                                                 messages
                                                 outbox
                                                 moderation flags
```

Consequences worth understanding:

- **Rendering an inbox is a single-collection query.** No `$lookup`, no N+1.
- **A vendor renaming, repricing or deleting a product cannot corrupt an
  existing enquiry.** The thread still shows what was asked about, at the price
  it was asked about.
- The module could be lifted into its own service or database without a join to
  untangle.

The only sanctioned places messaging reads other domains:

```
src/services/messaging/boundary/thread-context.service.ts    ← product/order snapshots
src/services/messaging/boundary/identity-contact.service.ts  ← participant snapshots, emails
```

> **Enforcement is by convention, not by tooling.** Verify with:
> ```bash
> grep -rn "from \"@/repositories/\(product\|order\|store\|user\)" \
>   src/modules/messaging src/domain/messaging src/services/messaging | grep -v "/boundary/"
> ```
> This must return nothing.

### 3.2 Side effects are events, not inline calls

Sending a message does exactly two things on the request path: **persist the
message** and **record the intent to notify**. Email, moderation notification,
digest jobs — all consequences, none on the request path.

If they ran inline, send latency would be bounded by the slowest SMTP handshake,
and a nodemailer timeout would lose a message that had already been written.

See §6.

### 3.3 Other modules depend on one façade only

The order, dispute and admin modules import exactly one thing from messaging:

```ts
import { MessagingEvents } from "@/services/messaging/messaging-events";
```

They never import the service, the repositories, or the domain types. They
announce that something happened; a registered handler decides what — if
anything — that means for conversations.

> Verify the reverse direction with:
> ```bash
> grep -rn "from \"@/services/messaging/\|from \"@/domain/messaging/\|from \"@/repositories/conversation" src \
>   | grep -v "^src/services/messaging\|^src/domain/messaging\|^src/modules/messaging\|^src/modules/server/messaging\|^src/modules/server/admin/moderation\|^src/app/api/cron/drain-message-outbox"
> ```
> Only `messaging-events` imports should appear.

---

## 4. Data Models

Four collections. `src/lib/db/models/`.

### 4.1 `conversations`

```ts
{
  _id,
  participants: [                       // exactly two in practice
    { kind: "user" | "store" | "admin",
      id: ObjectId,
      lastReadAt: Date,
      unreadCount: number,              // denormalised — see §4.5
      snapshot: {                       // frozen; powers inbox row + header
        name, initials, institution?, isVerified?
      }}
  ],
  scope: {
    kind: "product" | "order",          // drives the Products/Orders inbox tabs
    refId: ObjectId,                    // productId | subOrderId
    product?: IProductRef,              // snapshot, one of these two
    order?:   IOrderRef,
  },
  status: "open" | "locked" | "archived",
  lockedReason?: string,                // rendered in place of the composer
  lastMessageAt: Date,
  lastMessagePreview: string,           // denormalised for the inbox row
  createdAt, updatedAt
}
```

Each participant carries **its own snapshot of itself**, so either side's inbox
row renders from the conversation document alone.

### 4.2 `messages`

```ts
{
  _id,                                  // ObjectId — monotonic, doubles as cursor
  conversationId: ObjectId,
  sender: { kind, id },
  body: string,                         // max 4000
  ref?: { product?: IProductRef, order?: IOrderRef },
  systemType?: SystemMessageTypeEnum,   // platform notice — see §7
  sourceEventId?: ObjectId,             // idempotency key for notices — see §6.4
  createdAt, updatedAt
}
```

**Messages live in their own collection and are never embedded in the
conversation.** Embedding is the classic mistake here: MongoDB caps documents at
16 MB, which turns a thread into a bounded resource that fails in production,
and every conversation read would drag the full history over the wire.

**The per-message `ref` is independent of the conversation's `scope`.** A
customer can ask about a different product from inside an order thread — the
composer's "Asking about …" chip attaches that product to the single message.
`scope` groups and filters the thread; `ref` annotates individual messages.

### 4.3 `messageoutboxevents`

```ts
{
  _id,
  type: MessageOutboxEventEnum,
  payload: Record<string, unknown>,     // self-contained; handlers do no lookups
  status: "pending" | "processing" | "done" | "failed",
  attempts: number,
  availableAt: Date,                    // claim gate + backoff schedule
  createdAt, updatedAt
}
```

### 4.4 `moderationflags`

**One document per conversation, not per incident.** A vendor who solicits
off-platform payment ten times is one problem to review, not ten queue entries.
Repeat flags `$push` onto `entries`; a unique index on `conversationId` enforces
it.

```ts
{
  conversationId: ObjectId,             // unique
  entries: [{
    reason: "contact_details" | "user_report",
    messageId?, reportedBy?: {kind, id}, reportReason?, note?, signals?[], createdAt
  }],
  status: "pending" | "reviewed" | "dismissed",
  lastFlaggedAt: Date,
  reviewedBy?: { adminId, adminName }, reviewedAt?, reviewNote?
}
```

A new flag on an already-reviewed conversation **reopens it**: a moderator's
earlier "this is fine" was a judgement about what had happened then, not a
permanent exemption.

### 4.5 Unread counts are denormalised — and why

The naive implementation counts unread messages per conversation on every page
load:

```ts
// DO NOT DO THIS
countDocuments({ conversationId, read: false })
```

That is what makes chat features fall over. Instead each participant carries its
own `unreadCount`, `$inc`'d atomically for the **other** party when a message is
written.

- Inbox badge and the "N new" header pill → one indexed query, sum a field.
- Marking read → one `$set` on a subdocument.

Cost moves to the write, which is where it belongs: messages are read far more
often than they are sent.

### 4.6 Read receipts are derived, not stored

The ✓ / ✓✓ ticks need **no per-message state**. A message is delivered if it
persisted, and read if `counterparty.lastReadAt >= message.createdAt`, computed
in the projection.

Storing a per-message read flag would mean a write per message per read — the
single most expensive thing a chat schema can do, for information one timestamp
already implies.

### 4.7 Indexes

```
conversations: { "participants.id": 1, lastMessageAt: -1 }                    // inbox
conversations: { "participants.id": 1, "scope.kind": 1, lastMessageAt: -1 }   // filter tabs
conversations: { "scope.refId": 1, "participants.id": 1 }                     // dedupe on open
messages:      { conversationId: 1, _id: -1 }                                 // history
messages:      { conversationId: 1, sourceEventId: 1 } (sparse)               // notice idempotency
moderationflags: { status: 1, lastFlaggedAt: -1 }                             // queue
outbox:        { status: 1, availableAt: 1 }                                  // claim
```

### 4.8 Cursor pagination, never `skip`

`skip(900)` walks 900 documents server-side, so page 30 of a long thread costs
30× page 1. `_id` is monotonically increasing, so
`{ conversationId, _id: { $lt: cursor } }` is an index range scan at constant
cost regardless of depth.

**This rule is absolute in messaging.** Do not copy the `skip`/`limit` pattern
used by paginated orders.

---

## 5. The Write Path

`MessagingService.sendMessage()` — `src/services/messaging/messaging.service.ts`

```
  1. loadForParticipant()      → access check; throws if not a participant
  2. status check              → FORBIDDEN if not "open"
  3. checkRateLimit()          → 30/min per identity
  4. optional product snapshot → the "Asking about …" chip
  5. ┌─ TRANSACTION ─────────────────────────────────┐
     │  insert message                               │
     │  bump conversation (lastMessageAt, preview,   │
     │    $inc recipient unreadCount)                │
     │  insert outbox event  ← same transaction      │
     └───────────────────────────────────────────────┘
  6. moderation scan           → flags only; never blocks (§10.1)
  7. project and return
```

### 5.1 Why the outbox row is inside the transaction

If the message committed but the outbox row did not, a delivered message would
never notify anyone. If the outbox row committed but the message did not, we
would email someone about a message that does not exist. Writing both in one
transaction makes those states unreachable.

### 5.2 Transaction hygiene — a bug we already hit

Steps 6 and 7 are **outside** the `try` block, and the `catch` guards its abort:

```ts
} catch (error) {
  if (session.inTransaction()) {   // ← this guard matters
    await session.abortTransaction();
  }
  throw error;
}
```

Originally the projection ran inside the `try` **after** `commitTransaction()`.
When it threw, the `catch` called `abortTransaction()` on an already-committed
transaction, which throws its own error and masked the real one. The
user-visible failure was **a 500 error on a message that had actually been
delivered**.

> ⚠️ **The same pattern exists in `src/app/api/disputes/open/route.ts`** —
> `commitTransaction()` followed by response construction inside the same `try`,
> with `catch { abortTransaction() }`. It has not been fixed (financial code,
> out of scope at the time). If `NextResponse.json` ever threw, a successfully
> opened dispute with frozen vendor funds would report as a 500. Worth
> addressing.

---

## 6. The Outbox and Event Bus

### 6.1 The drain

`GET /api/cron/drain-message-outbox` — scheduled **every minute** in
`vercel.json`. Authenticated with `CRON_SECRET` via `verifyCronRequest`, and
reports run summaries to Telegram like every other job.

```
claim (atomic findOneAndUpdate) → dispatch to handlers → complete | fail+backoff
```

- **Max 50 events per run.**
- **Visibility timeout 5 minutes** — a claimed event whose function was killed
  becomes claimable again.
- **Retry backoff:** 1 min → 5 min → 30 min, then parked as `failed`
  (`MAX_ATTEMPTS = 4`).

### 6.2 Why cron and not a queue

Vercel Cron already existed here with an established handler shape. It is
durable, costs nothing new, and the drain loop is the same code a real worker
would run. Moving to QStash or Inngest later changes the *trigger*, not the
handlers.

The trade is latency: notification emails land within a minute rather than
instantly. The in-app path is unaffected, because the UI reads the message
directly.

### 6.3 The handler registry — the extension point

`src/services/messaging/handlers/index.ts`

```ts
const HANDLERS: OutboxHandler[] = [
  new NotifyRecipientHandler(),
  new AppendSystemMessageHandler(),
];
```

**This list is the extension point for the entire messaging system.** Push
notifications, digest emails, analytics webhooks — each is a new handler added
here. `sendMessage` is never edited again.

Handlers for the same event run independently; one failing does not prevent the
others from having run.

### 6.4 Handlers must be idempotent

The drain guarantees **at-least-once**, not exactly-once. A function killed
after doing its work but before marking the event done will see that event
again.

`AppendSystemMessageHandler` handles this with the `sourceEventId` key on
`messages`: before posting a notice it calls
`MessageRepository.existsBySourceEvent(conversationId, eventId)` and skips if
present. Without it, threads would accumulate duplicate notices every time a
function was killed at the wrong moment.

### 6.5 Event types

| Event | Published by | Consumed by |
|---|---|---|
| `message.sent` | `sendMessage` | `NotifyRecipientHandler` |
| `thread.opened` | `openThread` | `NotifyRecipientHandler` |
| `order.status_changed` | Order status procedure | `AppendSystemMessageHandler` |
| `dispute.opened` | `POST /api/disputes/open` | `AppendSystemMessageHandler` |
| `store.suspended` | Admin store action | `AppendSystemMessageHandler` |
| `store.reinstated` | Admin store action | `AppendSystemMessageHandler` |

### 6.6 Notification restraint

`NotifyRecipientHandler` suppresses email to anyone who has sent a message in
that thread within the last **10 minutes**. Emailing someone who is actively
typing in the conversation is how you get muted. The event is also enqueued with
a 60-second `availableAt` delay, so a quick back-and-forth never generates mail
at all.

---

## 7. System Notices

Platform-generated messages, rendered as centred grey pills rather than chat
bubbles — *"Payment is held in escrow until you confirm delivery"*, *"A dispute
was opened for this order."*

These originate in the **order and dispute modules**, which must not import
messaging. They publish an event; `AppendSystemMessageHandler` writes the
notice. **This is the single clearest justification for the event bus** — without
it, `updateDeliveryStatus` would have to import the messaging service and the two
modules would be welded together.

### 7.1 Existing threads only — an explicit product decision

A notice is appended **only where a conversation already exists**.

Creating a thread to announce "your order shipped" would turn the inbox into a
notification feed and put an unread badge on a conversation nobody started.
Status updates already have a delivery channel: email. A system notice is
**context for a live conversation**, nothing more.

In code: `findByScopeRef()` returns an empty array and the handler returns
early. The common case — nobody ever messaged about this order — is a no-op.

### 7.2 Attribution

System messages are attributed to the platform: `sender.kind = "admin"` and
`sender.id = conversation._id`, never a participant. Neither party may appear to
have said something they did not. The UI checks `systemType` **before** `isOwn`,
so a notice always renders centred regardless of the sender field.

---

## 8. The Read Path

`ConversationProjector` — `src/domain/messaging/conversation-projector.ts`

**Projections are an allow-list, not a filter.** A conversation document holds
both participants' ids, read state and unread counters. Each side receives only
its own, plus the counterpart's public snapshot. New fields added to the model
stay private until deliberately projected.

Everything is rendered from the conversation and message documents alone — no
lookups into products, orders, users or stores. That is what makes an inbox
listing a single indexed query.

| Method | Produces |
|---|---|
| `toInboxView` | One inbox row: counterpart, context label, preview, unread |
| `toThreadView` | Full thread: header, pinned About bar, messages, `canSend` |
| `toMessageView` | One bubble, with `isOwn` and derived `isRead` |
| `productRef` / `orderRef` | Reference cards, with money preformatted |

Money is **always preformatted server-side** (`formattedPrice`,
`formattedTotal`). The client never does currency arithmetic — consistent with
the platform-wide kobo convention.

Order references are **derived, never stored** — see `formatOrderNumber()` in
`src/lib/utils/order-number.ts`, producing `ORD-2026-8A3F2` from the ObjectId
and `placedAt`. Deliberately not sequential: a real counter would mean a
read-modify-write inside the order-creation transaction, which is financial
code. Not worth it for a display string.

---

## 9. Frontend Architecture

### 9.1 Transport isolation

`src/modules/messaging/messaging-client.ts` holds **every** delivery decision.
Components consume hooks and know nothing about how messages arrive.

```ts
const THREAD_POLL_MS = 4_000;    // open thread
const INBOX_POLL_MS  = 15_000;   // conversation list
const BADGE_POLL_MS  = 60_000;   // unread pill
```

All polls set `refetchIntervalInBackground: false`, so a backgrounded tab costs
nothing.

**To move to realtime:** replace these intervals with subscriptions in this file.
No component changes.

Role selection happens once:

```ts
const api = role === "vendor" ? trpc.vendorMessaging : trpc.customerMessaging;
```

Both routers expose identical signatures, so everything past this line is
role-agnostic. (Exception: mutations with divergent navigation are split into
separate components — see §9.4.)

### 9.2 Layout and routing

Two panes at `lg` and above; a single pane below it. The open conversation lives
in the URL as `?c=<id>`:

- The back gesture moves between list and thread on mobile with **no bespoke
  history handling**.
- A thread is directly linkable — which is how "Ask about this product"
  navigates after creating one.

State is managed with `nuqs` (`useQueryState`), already wired at the app root.

### 9.3 Components

`src/modules/messaging/components/`

| Component | Role |
|---|---|
| `messages-inbox.tsx` | Header, "N new" pill, search, filter tabs, rows |
| `thread-view.tsx` | Header, pinned About bar, message list, composer |
| `message-bubble.tsx` | Bubbles, day dividers, system notices |
| `reference-cards.tsx` | Product/order cards — used in bubbles, About bar and composer |
| `composer.tsx` | Input, quick replies, attachment chip, `LockedNotice` |
| `report-dialog.tsx` | Report flow (§10.2) |
| `message-vendor-button.tsx` | Product page CTA |
| `message-about-order-button.tsx` | Order page CTA |

Notes:

- **Message bodies are rendered as plain text, never HTML.** They are arbitrary
  input from another user.
- **Quick replies are configuration, not data** (`quick-replies.ts`), keyed by
  `(role, scopeKind)`. A vendor answering "where is my order?" needs different
  phrases from one answering a pre-purchase enquiry.
- Search is client-side over the loaded page, matching counterpart name and
  context label. Server-side search would be a different feature.
- `messaging-format.ts` handles chat-specific timestamps (`now` → `14:32` →
  `Yesterday` → `31 Jul`), which the app-wide `DateFormatter` deliberately does
  not cover.

### 9.4 A typing note worth knowing

Selecting between `trpc.customerMessaging` and `trpc.vendorMessaging` at runtime
works for **queries** but produces a union that defeats tRPC's error-type
inference for **mutations**. Hand-annotating the callbacks to work around it
throws away the type safety that makes the calls worth checking.

The fix used in `message-about-order-button.tsx`: two small components, one per
role, each calling its own procedure with full inference. Follow that pattern.

---

## 10. Moderation

### 10.1 Contact detection — why it exists

`src/services/messaging/moderation/contact-detector.ts`

The costliest abuse on a marketplace is a vendor moving the deal off-platform —
*"don't pay through the app, send me the money directly"*. It strips buyer
protection from the customer and commission from the platform, and **both
parties are usually happy about it**, so nobody reports it.

**A report button is structurally blind to this.** Detection is not.

Signals: Nigerian phone numbers (tolerating spaces/dots/hyphens), spelled-out
digits (4+ consecutive), emails (including `(at)`/`(dot)` obfuscation),
off-platform channel names (WhatsApp, Telegram, IG…), and payment-solicitation
phrases.

**It flags. It never blocks, never edits, and never warns the sender.**

- On a campus marketplace, exchanging a phone number is usually *legitimate* —
  riders call on delivery. Blocking would break the product to catch a minority.
- Warning the sender teaches evaders exactly what to avoid.

Treat the output as a **prior, not a verdict**. It is deliberately noisy; the
review queue is where judgement happens. Measured behaviour: all tested abuse
phrasings flagged, ordinary marketplace chatter passed, and
*"Call me on 08031234567 when you reach the gate"* flags — the expected false
positive, and precisely why it queues rather than blocks.

The scan runs **after** the transaction commits, and failures are swallowed. A
briefly incomplete moderation queue is a far smaller problem than a delivered
message reported as failed.

### 10.2 User reports

Either side can report a conversation. Fixed reason categories (scam,
off-platform payment, harassment, spam, other) — a queue of unstructured
complaints cannot be triaged at volume, and "asking to pay outside Soraxi" is
the category worth being able to count.

**Reporting does not lock the thread.** An accusation is not a finding, and
letting one party mute the other by pressing a button would be its own abuse
vector. The dialog copy says this explicitly. Rate-limited to 5/hour — a report
button is also a griefing tool.

### 10.3 Admin access — the policy, stated once

Admins can read a conversation **only when it has been flagged**. There is no
procedure that opens an arbitrary thread; the capability does not exist in the
API. The queue is the gate.

```ts
const flag = await ModerationFlagRepository.findByConversation(id);
if (!flag) throw new TRPCError({ code: "FORBIDDEN", ... });
```

- **Full history is returned**, not a window around the reported message.
  Context is usually what distinguishes harassment from a misunderstanding, and
  a moderator judging on a three-message excerpt will judge badly.
- **Every read is written to the audit log** (`conversation_read`), awaited, not
  fire-and-forget — if the log cannot be written, the read fails rather than
  happening unrecorded.
- **Participants are not notified.** That makes the audit log the *only* thing
  standing behind this promise. Treat it as a compliance record.
- **Reads are read-only.** Nothing can edit or delete a message — see §12.2.

Two permissions, split deliberately:

| Permission | Grants |
|---|---|
| `view_moderation_queue` | The queue and flag metadata — no message bodies |
| `read_reported_thread` | Opening the conversation itself |
| `moderate_conversations` | Lock/unlock, resolve flags |

Opening two private individuals' messages is a materially bigger step than
seeing that a thread was flagged, and should be grantable to fewer people.

---

## 11. Store Suspension Semantics

⚠️ **This section encodes a user-facing promise. Do not change it casually.**

The public storefront tells customers:

> *"Its products are hidden while we review the account. **Orders you already
> placed are unaffected.**"*

Therefore suspension locks **product threads only**:

| Thread scope | On suspension | Rationale |
|---|---|---|
| `product` | **Locked** | Pre-purchase enquiries to a store that cannot trade |
| `order` | **Left open** | Money is in escrow; the customer must be able to chase delivery |

Locking order threads would strand customers mid-delivery and contradict copy we
already ship. Reinstatement uses the same scope filter, so it reopens exactly
what suspension closed — and not anything a moderator locked by hand.

Locked threads remain **readable**. Someone whose vendor was suspended still
needs to read what was agreed. Only the composer is replaced, by `lockedReason`.

---

## 12. Privacy, Retention and Deletion

### 12.1 Account deletion — tombstone, don't erase

Messages contain personal data: phone numbers, hostel addresses ("I stay at
Malabor hostel"). Under NDPR this is regulated.

The policy is **tombstone the identity, keep the transcript**:

`ConversationRepository.tombstoneParticipant(participantId)` replaces the
participant's snapshot — name → "Deleted user", initials → "?", institution
removed — while message bodies survive.

Erasing everything a departing user wrote would blow holes in the other party's
threads and destroy dispute evidence, including in cases where the departing
user was the one at fault. Retaining the transcript of a completed transaction
is defensible as a legitimate interest; retaining someone's *name and
institution* against their wishes is much harder to argue. This draws the line
between the two.

> **⚠️ Nothing calls this yet.** Soraxi has no account-deletion flow. The
> function exists and is verified so that when deletion is built, the policy is
> a function call rather than a schema migration against live conversation data.

### 12.2 Messages are immutable

**There is no edit and no delete on messages, deliberately.** Threads are
dispute evidence. An admin-editable or user-editable transcript is worth nothing
in an adjudication.

If someone later asks for "edit message", understand that it undermines every
dispute ruling that cites a conversation.

---

## 13. Rate Limits and Tunables

All backed by `checkRateLimit()` (`src/lib/utils/rate-limiter.ts`) — an atomic
fixed-window limiter with a MongoDB TTL index.

| Constant | Value | Location |
|---|---|---|
| `SEND_LIMIT` | 30 / minute | `messaging.service.ts` |
| `OPEN_THREAD_LIMIT` | 10 / 10 minutes | `messaging.service.ts` |
| `REPORT_LIMIT` | 5 / hour | `messaging.service.ts` |
| `NOTIFY_DELAY_MS` | 60 s | `messaging.service.ts` |
| `INBOX_PAGE_SIZE` | 20 | `messaging.service.ts` |
| `THREAD_PAGE_SIZE` | 30 | `messaging.service.ts` |
| `PREVIEW_LENGTH` | 120 chars | `messaging.service.ts` |
| `ACTIVE_WINDOW_MS` | 10 min | `notify-recipient.handler.ts` |
| `MAX_EVENTS_PER_RUN` | 50 | `outbox-drain.service.ts` |
| `VISIBILITY_TIMEOUT_MS` | 5 min | `message-outbox.repository.ts` |
| `RETRY_BACKOFF_MS` | 1m / 5m / 30m | `message-outbox.repository.ts` |
| Poll intervals | 4s / 15s / 60s | `messaging-client.ts` |

---

## 14. File Inventory

```
src/lib/db/models/
  conversation.model.ts            conversations + participant/scope schemas
  message.model.ts                 messages, refs, systemType, sourceEventId
  message-outbox.model.ts          outbox events
  moderation-flag.model.ts         moderation queue

src/repositories/
  conversation.repository.ts       inbox, scope lookup, status, tombstone
  message.repository.ts            history, idempotency, activity checks
  message-outbox.repository.ts     claim / complete / fail + backoff
  moderation-flag.repository.ts    flag upsert, queue, resolve

src/domain/messaging/
  messaging-types.ts               client-facing view types
  conversation-projector.ts        allow-list projections

src/services/messaging/
  messaging.service.ts             openThread, sendMessage, markRead, report
  messaging-events.ts              ← the ONLY import for other modules
  outbox-drain.service.ts          the drain loop
  boundary/
    thread-context.service.ts      ← sanctioned cross-domain read
    identity-contact.service.ts    ← sanctioned cross-domain read
  handlers/
    types.ts                       OutboxHandler contract
    index.ts                       ← the registry / extension point
    notify-recipient.handler.ts    email, with activity suppression
    append-system-message.handler.ts  system notices, suspension locking
  moderation/
    contact-detector.ts            off-platform solicitation detection

src/services/interfaces/
  messaging-service.interface.ts

src/modules/server/messaging/
  shared.ts                        input schemas + identity guards
  customer.procedures.ts           customerMessaging router
  vendor.procedures.ts             vendorMessaging router

src/modules/server/admin/moderation/
  procedures.ts                    adminModeration router

src/modules/messaging/             customer + vendor UI (see §9.3)
src/modules/admin/moderation/
  moderation-queue.tsx             queue + thread reader

src/lib/utils/order-number.ts      formatOrderNumber()

routes:
  src/app/(user)/messages/page.tsx
  src/app/(store)/store/[store_id]/messages/page.tsx
  src/app/(admin)/admin/moderation/page.tsx
  src/app/api/cron/drain-message-outbox/route.ts
```

**Touched outside messaging:**

| File | Change |
|---|---|
| `src/enums/index.ts` | All messaging/moderation enums |
| `src/trpc/routers/_app.ts` | Three routers registered |
| `vercel.json` | Drain cron, every minute |
| `src/lib/db/models/user.model.ts` | `institution`, `lastSeenAt` |
| `src/lib/db/models/store.model.ts` | `lastSeenAt` |
| `.../order-status-management/procedures.ts` | Publishes `order.status_changed` |
| `src/app/api/disputes/open/route.ts` | Publishes `dispute.opened` |
| `src/modules/server/admin/store/procedures.ts` | Publishes suspension/reinstatement |
| `src/modules/{user,store}/components/constant.ts` | Sidebar entries |
| `src/modules/admin/constant.ts` | Moderation nav entry |
| `src/modules/admin/security/permissions.ts` | Three moderation permissions |
| `src/modules/admin/security/audit-logger.ts` | Moderation audit actions + module |
| `src/modules/products/product-detail/product-info.tsx` | "Ask about this product" |
| `src/modules/user/order/store-accordion.tsx` | "Message vendor" per sub-order |

---

## 15. How To Extend It

### Add a notification channel (push, SMS, digest)

1. Write a class implementing `OutboxHandler`.
2. Add it to `HANDLERS` in `handlers/index.ts`.
3. Make it idempotent (§6.4).

**Do not touch `sendMessage`.** That is the entire point of the outbox.

### Let another module trigger a system notice

1. Add the event type to `MessageOutboxEventEnum`.
2. Add a publisher method to `MessagingEvents`.
3. Handle it in `AppendSystemMessageHandler`.
4. Call the publisher **after** your business transaction commits.

Never import the messaging service from another module.

### Move to realtime delivery

Edit `messaging-client.ts` only. Replace the `refetchInterval` values with
subscriptions. Components are transport-agnostic by construction.

### Add a new thread scope (e.g. disputes)

1. Add to `MessageScopeKindEnum`.
2. Add a snapshot type in `conversation.model.ts` + `messaging-types.ts`.
3. Snapshot it in `ThreadContextService`.
4. Project it in `ConversationProjector`.
5. Add an inbox filter tab and a reference card.

### Add a moderation signal

Add a regex and a signal name in `contact-detector.ts`. It is pure and
synchronous — no I/O, trivially unit-testable. Keep it flagging, not blocking.

---

## 16. Testing and Verification

There is no automated test suite for messaging yet (see §17). Verification to
date was done with throwaway scripts against a dev server and the real database.

**What was verified end-to-end:**

| Check | Result |
|---|---|
| Message send, both roles, `isOwn` correctly inverted | ✅ |
| Unread fan-out lands on the recipient only | ✅ |
| Exactly one outbox row per send; drain claims and completes it | ✅ |
| Second drain claims nothing (no re-dispatch) | ✅ |
| `markRead` clears the badge | ✅ |
| Locked thread returns `canSend: false` with reason | ✅ |
| Abusive message still sends **and** raises a flag | ✅ |
| Innocuous message not flagged | ✅ |
| Notice appended to an existing order thread | ✅ |
| **No thread created** for an order nobody messaged about | ✅ |
| Redelivered event does not duplicate the notice | ✅ |
| Suspension locks product thread, leaves order thread open | ✅ |
| Reinstatement reopens and clears `lockedReason` | ✅ |
| Report queues a flag without locking the thread | ✅ |
| Admin **cannot** read an unflagged thread (`FORBIDDEN`) | ✅ |
| Refused read writes **no** audit entry | ✅ |
| Tombstone anonymises identity, preserves all messages | ✅ |
| Module boundary clean in both directions | ✅ |
| `tsc --noEmit` and `npm run build` | ✅ |

**Not verified:** visual QA of the chat UI at mobile/desktop breakpoints. No
browser automation is installed in this repo. The layout is sound by
construction and the data path is proven, but the 360 px pass across all states
(unread, locked, product scope, order scope, system notices) still wants human
eyes.

**Useful manual checks:**

```bash
# Drain the outbox locally
curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/drain-message-outbox

# Confirm an inbox query uses the index, not a collection scan
db.conversations.find({"participants.id": ObjectId("...")}).sort({lastMessageAt:-1}).explain()
# → expect IXSCAN, never COLLSCAN
```

---

## 17. Known Gaps and Future Work

| Gap | Notes |
|---|---|
| **No automated tests** | Highest-value follow-up. `contact-detector.ts` is pure and should be unit-tested first; the outbox claim/retry cycle second. |
| **Storefront "Message vendor" is disabled** | Threads are scoped to a product or order; there is no store-level thread for it to open. The button shows a tooltip pointing at "Ask about this product". Enabling it needs a decision: a third scope kind, or open the most recent existing thread with that store. |
| **No blocking** | A customer cannot block a vendor. Marketplace wrinkle: blocking someone you have an open order with would break delivery coordination, so it cannot be a simple two-way block. |
| **No attachments** | Text only. Threads already carry the item's images as context. Cloudinary is wired if this changes. |
| **No vendor response-time metric** | Designed ("replies within an hour") but cut — it needs message history to mean anything and would render empty at launch. The data to compute it accumulates in `messages`. |
| **Presence is approximate** | `lastSeenAt` stamped on authenticated requests, throttled ~1/min; online = seen within 5 min. No heartbeats by design. |
| **No retention purge** | Threads live forever. If a retention window is wanted, it must exclude anything attached to a dispute. |
| **Abort-after-commit in disputes route** | See §5.2. Pre-existing, unfixed. |
| **Search is client-side** | Over the loaded inbox page only. Fine at current volume; needs a server-side procedure if catalogues and inboxes grow. |
| **ESLint is broken repo-wide** | `Converting circular structure to JSON` from the eslintrc bridge — fails on untouched files too. Unrelated to messaging, but it means nothing in this repo is currently linted. |

# Soraxi Public Documentation — Authoring & Architecture

> **Platform:** Soraxi Marketplace
> **Last Updated:** August 2026
> **Audience:** Internal developers and anyone writing a help-centre article
> **Status:** Living document — update as the system evolves

---

## Table of Contents

1. [What This Covers](#1-what-this-covers)
2. [Architecture](#2-architecture)
3. [Adding an Article](#3-adding-an-article)
4. [The Article File Format](#4-the-article-file-format)
5. [Components Available in MDX](#5-components-available-in-mdx)
6. [Categories and Navigation](#6-categories-and-navigation)
7. [Disclosure Policy](#7-disclosure-policy)
8. [House Style](#8-house-style)
9. [Facts That Must Track the Code](#9-facts-that-must-track-the-code)
10. [Verification](#10-verification)
11. [File Inventory](#11-file-inventory)
12. [Known Gaps and Future Work](#12-known-gaps-and-future-work)

---

## 1. What This Covers

The public help centre at `/docs` — the articles buyers and vendors read. It is
MDX rendered by a catch-all route, with a sidebar, a table of contents, and a
landing page.

This document is the reference for **adding and editing those articles**, and
for the constraints that govern what may appear in them.

### What changed, and why it matters

The route used to resolve articles by building an import path at runtime:

```ts
const modulePath = `@/app/docs/articles/${category}/${page}.mdx`;
const module = await import(modulePath);
```

No bundler can resolve that. The argument is a bare variable, so there is no
static prefix to build a context from, and the `@/` alias is a compile-time
concern that never survives into a runtime string. It was wrapped in a
`try/catch` that returned `null`, so every failure — a missing article, a broken
article, an unresolvable import — surfaced identically as a 404.

Articles are now resolved through an **explicit registry of static imports**
(§2). The practical consequences for you:

- A nav entry pointing at a file that does not exist is a **type error**, not a
  404 you find by clicking.
- An MDX syntax error **throws into the error boundary** instead of rendering as
  "page not found".
- Each article is its own chunk, and article prose never reaches the client
  bundle.

---

## 2. Architecture

```
  REQUEST  /docs/protection/how-escrow-works
       │
  app/docs/[...slug]/page.tsx
       │  slug = ["protection", "how-escrow-works"]
       │  joined → "protection/how-escrow-works"
       ▼
  article-registry.ts          getArticleLoader(slug)
       │  explicit map: slug → () => import("…/how-escrow-works.mdx")
       │  miss → notFound()
       ▼
  articles/protection/how-escrow-works.mdx
       │  default export rendered with MDXComponents
       ▼
  RENDERED PAGE
       ├── SidebarNav          ← help-center-data.ts
       └── TableOfContents     ← scrapes h2/h3 from .prose-content
```

### The three files that matter

| File                                          | Role                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/lib/utils/mdx-utils/article-registry.ts` | `server-only`. Maps every slug to a static import. The set of articles that exist.          |
| `src/lib/utils/mdx-utils/help-center-data.ts` | Client-safe. Categories, titles and ordering. What the sidebar and landing page display.     |
| `src/app/docs/[...slug]/page.tsx`             | Looks the slug up, renders it. Contains no knowledge of individual articles.                 |

The split exists because `SidebarNav` is a **client component**. If the loaders
lived in `help-center-data.ts`, every MDX article would be pulled into the client
graph. `help-center-data.ts` imports only the `ArticleSlug` *type* from the
registry — a type-only import, erased at compile time — which is what gives the
compile-time slug check without the bundle cost.

### Rendering mode

`generateStaticParams` enumerates the registry and `dynamicParams = false`, so
only registered slugs are routable; anything else 404s before the page module
runs.

> **Note — the docs routes still render dynamically.** They show as `ƒ` in the
> build output, not `○`. `app/docs/layout.tsx` renders `HomeHeader`, which reads
> cookies to show the signed-in user, and that opts the whole route out of
> prerendering. `dynamicParams = false` still restricts the valid slug set.
> Making docs genuinely static means moving the auth-dependent part of the header
> behind a client boundary.

---

## 3. Adding an Article

Three steps, in this order.

### Step 1 — Create the file

```
src/app/docs/articles/<category>/<page>.mdx
```

The path is not what makes it routable — the registry is. But keep the file path
and the slug identical anyway; a mismatch is legal and confusing.

### Step 2 — Register it

In `article-registry.ts`, add a line inside the correct section:

```ts
"protection/how-escrow-works": () =>
  import("@/app/docs/articles/protection/how-escrow-works.mdx"),
```

The import path **must be a string literal**. Anything computed defeats the whole
mechanism and takes you back to the runtime-import bug this replaced.

At this point the article is reachable by URL but appears in no navigation.

### Step 3 — List it in the navigation

In `help-center-data.ts`, add it to a category's `pages`:

```ts
{
  id: "how-escrow-works",
  title: "How Escrow Protects You",
  slug: "protection/how-escrow-works",
},
```

- `id` — unique within the category; used as the React key
- `title` — what the sidebar and landing-page bullets show
- `slug` — typed as `ArticleSlug`, so this will not compile unless step 2 is done

### Adding a whole category

Add a new object to `helpCenterCategories` with `id`, `name`, `description`,
`card` and `pages`. The landing page derives its cards from this array, so no
second edit is needed — that duplication was removed deliberately.

The `card.icon` is a `lucide-react` component; import it at the top of the file.

---

## 4. The Article File Format

```mdx
export const metadata = {
  title: "How Escrow Protects You",
  description:
    "Soraxi holds your payment until you have your item. Here is what that means.",
};

# How Escrow Protects You

An opening paragraph that says what the reader gets, in plain language.

## First section

Body text.

### A subsection

More body text.
```

### Rules

- **`metadata` export** at the top. See §12 — it is not yet wired to page
  metadata, but keep exporting it so the fix is a one-line change.
- **Exactly one `#`** — the article title. Never a second one.
- **`##` and `###` only** for structure. The table of contents scrapes `h2, h3`
  from inside `.prose-content`; `####` renders but is invisible to the ToC.
- **Two-segment slugs only.** The route rejects `slug.length !== 2`, so
  `/docs/buying/orders/detail` cannot exist.
- **Internal links use the public path**: `[Opening a Dispute](/docs/protection/opening-a-dispute)`.
  Not a file path, not a relative link.

---

## 5. Components Available in MDX

Defined in `src/lib/utils/mdx-utils/mdx-components.tsx` and passed to every
article. No import statement is needed inside the `.mdx` file.

| Component        | Props                  | Use for                                                    |
| ---------------- | ---------------------- | ---------------------------------------------------------- |
| `<Note>`         | `type`, children       | A framed aside. `type` is `info` \| `success` \| `warning` \| `error` |
| `<Warning>`      | children               | A hazard the reader can walk into                           |
| `<Tip>`          | children               | Advice that improves an outcome but is not required         |
| `<Steps>`        | children               | An ordered list with generous spacing                       |
| `<Screenshot>`   | `src`, `alt`, `caption`| A captioned, bordered image                                 |
| `<YouTubeEmbed>` | `videoId`              | An embedded video                                           |

Plain `img` and `video` tags are also styled.

### Choosing between Note, Warning and Tip

They are not interchangeable, and using them interchangeably makes all three
invisible:

- `<Warning>` — **the reader can lose money or be harmed.** Sharing a delivery
  code early, paying off-platform, confirming an undelivered order.
- `<Note type="warning">` — a deadline or constraint with real consequences, but
  not a hazard. "Once an order settles, the dispute route closes."
- `<Note type="info">` — clarification. "Each vendor fulfils independently."
- `<Note type="success">` — a reassurance worth landing. The escrow summary.
- `<Note type="error">` — reserved for impersonation and fraud warnings. "No one
  from Soraxi will ever ask for your password."
- `<Tip>` — optional advice. Pricing strategy, photography, batching withdrawals.

Roughly two to four framed asides per article. More than that and the page reads
as one long alarm.

> **Note — `<Screenshot>` needs a real image.** With no `src` it silently falls
> back to `siteConfig.placeHolderImg`, which renders a placeholder in production.
> Images live in `public/docs-images/<category>/`. Articles written without
> screenshots omit the component entirely rather than pointing at a file that
> does not exist yet.

---

## 6. Categories and Navigation

### Category membership is editorial

A page's category in `help-center-data.ts` is **independent of its file path**.
The registry keys on the full slug, and the route splits on `/` — nothing
requires `pages[]` membership to match the directory.

This is used deliberately: `storefront/payout-settings` is listed under **Getting
Paid**, where vendors look for it, while keeping the URL it has always had.
Prefer editorial placement over renaming a live URL.

### Ordering

Articles appear in the order they are listed. Order them as a reader progresses,
not alphabetically — apply, then set up, then manage.

### Landing page

`app/docs/page.tsx` maps over `helpCenterCategories`. Each card shows
`card.title`, `card.description`, the `card.icon`, an optional **Popular** badge,
and its page titles as bullets. The card links to the category's first page via
`categoryEntryHref`.

---

## 7. Disclosure Policy

**These articles are public.** Anything written here is readable by competitors,
by people probing for weaknesses, and by anyone who wants to game the platform.

### Never publish

- **The financial internals** — the ledger, double-entry accounts, journal
  entries, wallet state machines, reconciliation.
- **System design** — service, router and model names; the outbox pattern; the
  tRPC structure; repository or domain layout.
- **Scheduled jobs** — their existence, names, cadence, or what they sweep.
- **Moderation heuristics** — what is detected, how, or what triggers review.
  This one is not a preference. Detection of off-platform contact exchange is
  deliberately silent, and publishing how it works would disable it: a warning
  teaches evaders precisely what to avoid.
- **Evidential weighting** — which delivery-confirmation methods count as strong
  or weak. Vendors are told the code protects them; they are not given a map of
  which route is easiest to argue against.
- **Gateway routing** — provider names, failover order, which are enabled.
- **Admin tooling** — anything about how staff review, resolve or intervene.
- **Security bounds** — code attempt limits, token lifetimes, rate limits,
  lockout thresholds. Describe the behaviour ("too many wrong entries will lock
  the link"), never the number.

### Standing decisions

Agreed with the founders, August 2026. Change these only with the same authority:

| Topic                | Decision                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Commission and fees  | **Publish exact figures.** The tiered commission, withdrawal limits and withdrawal fee are all public. |
| Penalties and debt   | **State that they exist; publish no numbers.** No percentage, no cap, no debt threshold.               |
| Buyer-facing deadlines | **Publish all.** Auto-confirmation, dispute review and evidence windows are commitments to users.    |
| Payment providers    | **Do not name.** "A secure payment partner." Keeps the provider mix and any future switch invisible.   |

### The test to apply

Before writing a sentence about how something works, ask: *does the reader need
this to use Soraxi, or does it only satisfy curiosity about how Soraxi is built?*
Public docs answer **what to do and what to expect**. They never explain the
implementation.

---

## 8. House Style

The articles are written for a Nigerian university student on a phone, often on
a poor connection, often mid-problem. They are not marketing copy.

- **Second person, present tense.** "You confirm delivery", not "the buyer may
  confirm delivery".
- **Lead with what the reader came for.** The answer first; the background after.
- **Name the real screens and buttons.** "Open **Orders** from your account menu"
  beats "navigate to the orders section".
- **Money in ₦ with worked examples.** A fee table is abstract until it says "a
  ₦10,000 sale leaves you ₦9,300".
- **Say the uncomfortable part.** The auto-confirmation window means a buyer who
  does nothing loses their protection. That sentence belongs in the article, in
  bold, not softened away.
- **No fabricated specifics.** Do not invent processing windows, response times
  or SLAs. If the code does not establish it, either leave it out or get a
  decision. The previous payout article promised a weekly "Friday–Sunday
  processing window" that existed nowhere in the system.
- **Cross-link deliberately.** Every article that mentions escrow, disputes or
  the delivery code should link to the article that owns that topic.
- **End with FAQs.** Real questions support actually receives, answered in one or
  two sentences.

### Structural convention

```
Title (h1)
Framing paragraph — what this page gives you
## The main procedure or explanation
## Edge cases / what to do when it goes wrong
## FAQs
```

---

## 9. Facts That Must Track the Code

Public prose now hard-codes values that live in the codebase. When a constant
changes, these articles are part of the change.

| Value in prose                  | Source of truth                                              | Articles affected                                                        |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 3-day auto-confirmation         | `AUTO_CONFIRM_DAYS`, `services/orders/order-auto-confirm.service.ts` | order-statuses, confirming-delivery, delivery-code, how-escrow-works, how-you-get-paid, proof-of-delivery |
| 5 business days dispute review  | `DISPUTE_RESOLUTION_BUSINESS_DAYS`                           | opening-a-dispute, vendor-disputes, refunds-and-cancellations             |
| 48-hour evidence window         | `ADDITIONAL_EVIDENCE_WINDOW_HOURS`                           | opening-a-dispute, vendor-disputes                                       |
| Commission: 5% + ₦100/₦200 tiers | `lib/utils/calculate-commission.ts`                          | fees-and-commission                                                      |
| Withdrawal min ₦1,000 / max ₦100,000 | `WITHDRAWAL_LIMITS`, `MINIMUM_PAYOUT_AMOUNT_KOBO`        | fees-and-commission, withdrawals, payout-settings                        |
| Withdrawal fee 1% + ₦50         | `WITHDRAWAL_FEES`                                            | fees-and-commission, withdrawals, payout-settings                        |
| Product limits (₦500–₦100,000, 3 images, 4MB) | `validators/product-validators.ts`, `constants/image.constants.ts` | manage-products                                     |
| Order status transitions        | `domain/orders/order.ts` — `canTransition`                   | order-statuses, order-fulfilment                                         |

> **Note.** `grep -rn "3 days\|5 business days\|48 hours" src/app/docs/articles`
> before shipping a change to any of these constants.

---

## 10. Verification

### The slug type check

The strongest guard is free. Point a nav entry at an unregistered slug and
`npx tsc --noEmit` fails:

```
help-center-data.ts(62,9): error TS2322: Type '"account/this-does-not-exist"'
is not assignable to type '"account/create-account" | …'
```

### Build

`npm run build` compiles every registered article. An MDX syntax error fails the
build rather than shipping a 404.

> **Note — Turbopack MDX loader timeouts.** With the article count in the
> twenties, `next build` has intermittently failed with
> `TurbopackInternalError: failed to receive message` inside
> `evaluate_webpack_loader`. It is a loader-bridge deadline, not a content error,
> and it does not reproduce consistently. If you hit it, retry before
> investigating the MDX; if it becomes reproducible, `next build --webpack` is
> the escape hatch.

### Smoke test

```bash
npm run start

# Every registered slug must return 200
slugs=$(grep -oE '^  "[a-z]+/[a-z0-9-]+":' src/lib/utils/mdx-utils/article-registry.ts | tr -d ' ":')
for s in $slugs; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/docs/$s")
  [ "$code" = "200" ] || echo "FAIL $code /docs/$s"
done

# These must all return 404
for p in "buying/nope" "nope/nope" "buying" "buying/orders/detail"; do
  printf "%-24s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3000/docs/$p")"
done
```

An unregistered slug, a one-segment path and a three-segment path must all 404 —
the last two because the route rejects `slug.length !== 2`.

### Disclosure check

A crude but effective backstop against §7 leaking into an article:

```bash
grep -rilE "flutterwave|paystack|ledger|journal entry|cron|outbox|trpc|mongoose" \
  src/app/docs/articles --include=*.mdx   # must be empty
```

### Link check

Every `/docs/...` link in the articles should resolve to a registered slug:

```bash
grep -rhoE '\(/docs/[a-z0-9-]+/[a-z0-9-]+\)' src/app/docs/articles --include=*.mdx \
  | tr -d '()' | sed 's|/docs/||' | sort -u > /tmp/links.txt
grep -oE '"[a-z]+/[a-z0-9-]+":' src/lib/utils/mdx-utils/article-registry.ts \
  | tr -d '":' | sort -u > /tmp/slugs.txt
comm -23 /tmp/links.txt /tmp/slugs.txt   # must be empty
```

---

## 11. File Inventory

| Path                                          | Purpose                                                   |
| --------------------------------------------- | --------------------------------------------------------- |
| `src/app/docs/page.tsx`                       | Landing page; derives cards from `helpCenterCategories`    |
| `src/app/docs/layout.tsx`                     | Header, sidebar, mobile sidebar, mobile ToC, footer        |
| `src/app/docs/[...slug]/page.tsx`             | Article route                                              |
| `src/app/docs/articles/<category>/<page>.mdx` | The articles themselves                                    |
| `src/lib/utils/mdx-utils/article-registry.ts` | Slug → static import map (`server-only`)                   |
| `src/lib/utils/mdx-utils/help-center-data.ts` | Categories, titles, ordering, landing-page cards           |
| `src/lib/utils/mdx-utils/mdx-components.tsx`  | The components available inside MDX                        |
| `src/lib/utils/mdx-utils/table-of-contents.tsx` | Desktop ToC; scrapes `h2, h3` from `.prose-content`      |
| `src/lib/utils/mdx-utils/mobile-table-of-contents.tsx` | Mobile ToC                                        |
| `src/components/sidebar-nav.tsx`              | Sidebar (client component — see §2)                        |
| `public/docs-images/<category>/`              | Screenshots                                                |

### Current categories

| Category      | Sidebar name           | Articles |
| ------------- | ---------------------- | -------- |
| `account`     | Account & Verification | 4        |
| `buying`      | Buying on Soraxi       | 8        |
| `protection`  | Buyer Protection       | 4        |
| `storefront`  | Selling on Soraxi      | 6        |
| `fulfilment`  | Orders & Fulfilment    | 3        |
| `payouts`     | Getting Paid           | 4        |

`updates` (announcements, policy changes) is scaffolded and commented out in
`help-center-data.ts`.

---

## 12. Known Gaps and Future Work

- **`metadata` is exported but unused.** Articles export `title` and
  `description`, and the route has no `generateMetadata`, so every docs page
  shares the root layout's tags. Every article page currently competes for the
  same search snippet. The fix is to load the article module in
  `generateMetadata` and return its `metadata`.
- **No search.** With six categories and 29 articles, the sidebar is at the edge
  of what browsing alone supports.
- **Docs render dynamically** because the shared header reads cookies (§2).
- **No screenshots on the newer articles.** Only `account` and `storefront`
  images exist under `public/docs-images/`. Articles written since deliberately
  omit `<Screenshot>` rather than point at missing files. Adding images is a pure
  addition — insert the component where a screenshot would help.
- **Older articles still carry the original screenshot set.** If a UI screen
  changes, `grep -rn "docs-images" src/app/docs/articles` finds every affected
  caption.
- **The public return policy and the dispute window disagree.**
  `/shipping-return-policy` promises returns "within 7 days of delivery", but a
  dispute is only possible while the sub-order is unsettled — and settlement is
  automatic 3 days after despatch. Either the policy page or the settlement
  window needs to move; the help-centre articles currently document the
  mechanism as built.

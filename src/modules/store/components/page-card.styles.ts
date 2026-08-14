/**
 * Call-site styling that turns a flush `SoraxiCard` into a boxed card on
 * desktop.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE STACKED-PADDING PROBLEM THIS SOLVES
 * ─────────────────────────────────────────────────────────────────────────────
 * Layouts nest containers: page wrapper → card → sometimes a panel inside that.
 * When every layer carries its own horizontal padding, the padding *stacks*. On
 * a 375px phone a 24px page gutter plus a 24px card gutter costs 96px — around
 * a quarter of the screen — before a single character is drawn. Text wraps
 * early, buttons crowd, cards feel boxed-in. At desktop widths the same
 * stacking is invisible, which is precisely why it ships unnoticed.
 *
 * The rule: **one layer owns the gutter.** The page container provides it
 * (16 → 24 → 32px) and cards stay flush inside it on small screens, reading as
 * sections of the page rather than boxes nested in a padded box. At `lg` there
 * is width to spare, so the card treatment returns.
 *
 * `SoraxiCard` deliberately owns only the flush half — it is shared by the
 * onboarding and product wizards and is not ours to change. This constant adds
 * the desktop half where a page wants it:
 *
 * ```tsx
 * <SoraxiCard className={pageCardLg}>…</SoraxiCard>
 * ```
 *
 * Anything nested *inside* such a card must not add horizontal padding of its
 * own on mobile, or the stacking returns one level down.
 */
export const pageCardLg =
  "lg:rounded-xl lg:border lg:border-soraxi-green/15 lg:bg-background lg:p-6 lg:shadow-sm";

/**
 * The page-level gutter. The single source of horizontal inset for a store
 * page: 16px on phones, 24px from `sm`, 32px from `lg`.
 */
export const pageGutter = "px-4 sm:px-6 lg:px-8";

export const soraxiTabsTriggerStyle =
  "w-fit border-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green py-3";

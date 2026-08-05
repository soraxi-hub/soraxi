/**
 * Timestamp formatting for chat surfaces.
 *
 * Chat has its own conventions that the app's `DateFormatter` deliberately
 * doesn't cover: an inbox row wants the shortest string that still
 * disambiguates ("now", "14:32", "Yesterday", "31 Jul"), while a message wants
 * a bare clock time because the day is already established by a divider above
 * it.
 */

const MINUTE_MS = 60 * 1000;

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

/** Whole days between two dates, ignoring time of day. */
function dayDelta(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / (24 * 60 * MINUTE_MS));
}

/** `14:32` — used under message bubbles. */
export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The shortest unambiguous label for an inbox row.
 *
 * `now` → `14:32` → `Yesterday` → `31 Jul` → `31 Jul 2025`, widening only as
 * far as it must to stay unambiguous.
 */
export function formatInboxTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (now.getTime() - date.getTime() < MINUTE_MS) return "now";

  const days = dayDelta(date, now);

  if (days === 0) return formatClockTime(iso);
  if (days === 1) return "Yesterday";

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** `Today` / `Yesterday` / `31 July` — the divider between days in a thread. */
export function formatDayDivider(iso: string): string {
  const date = new Date(iso);
  const days = dayDelta(date, new Date());

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
  });
}

/** Whether two timestamps fall on different days — i.e. a divider is due. */
export function isNewDay(previousIso: string | undefined, iso: string): boolean {
  if (!previousIso) return true;
  return startOfDay(new Date(previousIso)) !== startOfDay(new Date(iso));
}

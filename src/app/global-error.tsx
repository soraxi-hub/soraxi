"use client";

import "./globals.css";
import { SegmentError } from "@/components/errors/segment-error";

/**
 * Last-resort boundary for errors thrown by the root layout itself.
 *
 * `app/error.tsx` cannot cover these: a segment's error boundary renders
 * *inside* that segment's layout, so if the layout is what threw there is no
 * surviving tree to render it into. Next.js swaps in this file instead, which
 * is why it must supply its own `<html>` and `<body>` — it replaces the root
 * layout rather than nesting inside it.
 *
 * Nothing here may depend on the providers in `layout.tsx` (theme, tRPC,
 * nuqs), since a crash in one of them is exactly the case being handled.
 * `globals.css` is imported directly for the same reason: the layout that
 * normally pulls it in never ran. Without a theme provider the CSS variables
 * resolve to their `:root` light values, which is correct rather than merely
 * acceptable — an unstyled page is the failure this replaces.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <SegmentError error={error} reset={reset} />
      </body>
    </html>
  );
}

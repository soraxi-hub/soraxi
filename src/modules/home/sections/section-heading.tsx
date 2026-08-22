import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** Rendered on the right of the title, e.g. a "View all" link. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Title + subtitle + optional trailing action.
 *
 * Every band on the home page opens the same way, so the spacing between title
 * and subtitle is set once here. When each section owned its own heading markup
 * they drifted apart by a few pixels each, which reads as sloppiness rather
 * than as a deliberate difference.
 */
export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

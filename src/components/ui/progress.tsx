import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Progress component for displaying progress bars
 *
 * @param value - The current progress value (0-100)
 * @param max - The maximum value (default: 100)
 * @param className - Additional CSS classes for the container
 * @param indicatorClassName - Additional CSS classes for the indicator
 */
const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number;
    max?: number;
    indicatorClassName?: string;
  }
>(({ className, value, max = 100, indicatorClassName, ...props }, ref) => {
  const percentage = value != null ? Math.min(Math.max(0, value), max) : 0;

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={percentage}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full w-full flex-1 bg-primary transition-all",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
});
Progress.displayName = "Progress";

export { Progress };

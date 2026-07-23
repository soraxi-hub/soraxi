import * as React from "react";

import { cn } from "@/lib/utils";

function SoraxiCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card"
      className={cn(
        // structural
        "flex flex-col gap-6 py-4",
        // default text color
        "text-black dark:text-white",
        // flush/borderless until root layout's own padding kicks in at lg
        "rounded-none border-0 shadow-none",
        className,
      )}
      {...props}
    />
  );
}

function SoraxiCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-0 has-data-[slot=soraxi-card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function SoraxiCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function SoraxiCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card-description"
      className={cn("text-sm", className)}
      {...props}
    />
  );
}

function SoraxiCardAction({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function SoraxiCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card-content"
      className={cn("px-0", className)}
      {...props}
    />
  );
}

function SoraxiCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="soraxi-card-footer"
      className={cn("flex items-center px-0", className)}
      {...props}
    />
  );
}

export {
  SoraxiCard,
  SoraxiCardHeader,
  SoraxiCardFooter,
  SoraxiCardTitle,
  SoraxiCardAction,
  SoraxiCardDescription,
  SoraxiCardContent,
};

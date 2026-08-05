"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function SoraxiTabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="soraxi-tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SoraxiTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="soraxi-tabs-list"
      className={cn(
        // flush, full-width underline bar instead of the default pill/segmented look
        "w-full border-none p-0 rounded-none h-auto bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

function SoraxiTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="soraxi-tabs-trigger"
      className={cn(
        // underline-on-active style, no background/shadow/border-radius
        "w-fit border-0 rounded-none py-3 bg-transparent shadow-none",
        "text-foreground dark:text-muted-foreground text-sm font-medium whitespace-nowrap",
        "transition-colors focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green",
        "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function SoraxiTabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="soraxi-tabs-content"
      className={cn("mt-6 flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { SoraxiTabs, SoraxiTabsList, SoraxiTabsTrigger, SoraxiTabsContent };

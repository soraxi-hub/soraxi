import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

// Input variants (brand-friendly)
const inputVariants = cva(
  // base styles shared by all inputs
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground " +
    "flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs " +
    "transition-[color,box-shadow,border-color] outline-none " +
    "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium " +
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        // ✅ Brand green (your primary input)
        primary:
          "border-gray-300 text-foreground " +
          "hover:border-soraxi-green focus:border-soraxi-green " + // green border
          "focus-visible:ring-soraxi-green/20 focus-visible:ring-[1px]", // green ring

        // 🚨 Error input
        destructive:
          "border-destructive text-destructive " +
          "focus:border-destructive focus-visible:ring-destructive/40 focus-visible:ring-[3px]",

        // Minimal outlined style
        outline:
          "border border-input bg-transparent text-foreground " +
          "hover:border-ring/40 focus:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",

        // Muted background style
        secondary:
          "bg-secondary text-secondary-foreground border-0 " +
          "hover:bg-secondary/80 focus-visible:ring-ring/30",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

function Input({
  variant,
  className,
  type,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Input };

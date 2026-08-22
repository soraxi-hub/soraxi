import Link from "next/link";
import {
  BookOpen,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { categories } from "@/constants/constant";

import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

/**
 * Icon per category, keyed by the slug already stored in the database.
 *
 * Keyed rather than positional so reordering `categories` — or adding a sixth —
 * cannot silently shift every icon by one. An unmapped slug falls back to the
 * basket instead of rendering an empty box.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "fashion-accessories": Shirt,
  "electronics-gadgets": Smartphone,
  "books-stationery": BookOpen,
  "beauty-personal-care": Sparkles,
  "groceries-essentials": ShoppingBasket,
};

/**
 * The five top-level categories, straight from the `categories` constant.
 *
 * Deliberately not a hand-written list: these slugs must match what is stored
 * on products or filtering breaks, and a duplicated copy here would be the
 * thing that drifts.
 */
export function ShopByCategory() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          title="Shop by category"
          subtitle={`${categories.length === 5 ? "Five" : categories.length} categories, every one stocked by campus vendors`}
        />

        {/*
          Two across on a phone rather than one: these tiles are only a line of
          text tall, and a single column turns five of them into a scroll.
        */}
        <div
          className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5")}
        >
          {categories.map((category, idx) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? ShoppingBasket;

            return (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className={cn(
                  // span two columns on the smallest breakpoint for the last item
                  idx === categories.length - 1
                    ? "col-span-2 lg:col-span-1"
                    : "",
                  "group flex flex-col gap-3 rounded-xl border border-border bg-transparent p-4 transition-colors hover:border-soraxi-green/40 hover:bg-soraxi-green/5",
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-full bg-soraxi-green/10">
                  <Icon className="size-4 text-soraxi-green" aria-hidden />
                </span>

                <span className="text-sm font-medium text-foreground group-hover:text-soraxi-green">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

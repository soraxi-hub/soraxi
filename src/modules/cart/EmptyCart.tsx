"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowLeft } from "lucide-react";

export function EmptyCart() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-24 h-24 bg-soraxi-green/20 rounded-full flex items-center justify-center mb-6">
        <ShoppingCart className="h-12 w-12 text-soraxi-green" />
      </div>

      <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Looks like you haven&apos;t added any items to your cart yet. Start
        shopping to fill it up!
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          asChild
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Continue Shopping
          </Link>
        </Button>

        <Button variant="outline" asChild>
          <Link href="/categories">Browse Categories</Link>
        </Button>
      </div>

      {/* Popular Categories */}
      <div className="mt-12">
        <h3 className="text-lg font-medium mb-4">Popular Categories</h3>
        <div className="flex flex-wrap justify-center gap-2">
          {["Electronics", "Fashion", "Furniture", "Clothing", "Toys"].map(
            (category) => (
              <Button key={category} variant="outline" size="sm" asChild>
                <Link
                  href={`/category/${category
                    .toLowerCase()
                    .replace(" & ", "-")}`}
                >
                  {category}
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

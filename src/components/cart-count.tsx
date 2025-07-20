"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/modules/store/cart-store";

function CartCount() {
  const totalQuantity = useCartStore((state) => state.totalQuantity);

  return (
    <Link href="/cart">
      <Button size="sm" variant="ghost" className="flex gap-x-1.5">
        <ShoppingBag className="h-5 w-5" />
        <span className="text-sm font-bold">{totalQuantity}</span>
        <span className="sr-only">Cart</span>
      </Button>
    </Link>
  );
}

export default CartCount;

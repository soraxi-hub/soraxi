"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { formatNaira } from "@/lib/utils/naira";
import { MoreHorizontal, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

export function UserOrders({ userId }: { userId: string }) {
  const trpc = useTRPC();
  const { data: orders } = useSuspenseQuery(
    trpc.order.getByUserId.queryOptions({ userId })
  );

  return (
    <main className="min-h-screen w-full py-6">
      <div className="bg-background rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Order History
          </h1>
          <Badge className="bg-primary/10 text-primary text-sm md:text-base px-3 py-1 rounded-full">
            {orders.length} Orders
          </Badge>
        </div>

        <div className="divide-y divide-border">
          {orders.length > 0 ? (
            orders.map((order) => (
              <div
                key={order._id}
                className="py-6 px-4 md:px-6 bg-card hover:bg-card/95 transition-colors"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Order Date:{" "}
                      <time dateTime={new Date(order.createdAt).toISOString()}>
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      Total: {formatNaira(order.totalAmount)}
                    </p>
                    <Badge
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.paymentStatus === "Paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      Payment: {order.paymentStatus}
                    </Badge>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:bg-accent"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/orders/${order._id}`}>View Details</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4 mt-4">
                  {order.subOrders.map((sub) => (
                    <div
                      key={sub.store._id}
                      className="border border-border rounded-lg p-4 bg-background/50 shadow-sm"
                    >
                      <h3 className="text-base font-semibold text-foreground mb-3">
                        Store: {sub.store.name}
                      </h3>

                      <div className="divide-y divide-border">
                        {sub.products.map((product) => (
                          <div
                            key={product._id}
                            className="flex gap-4 items-center py-3 first:pt-0"
                          >
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md overflow-hidden border border-border">
                              <Image
                                src={
                                  product.Product.images?.[0] ??
                                  "/placeholder.svg"
                                }
                                alt={product.Product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className="font-medium text-foreground text-base">
                                {product.Product.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {product.quantity} &bull;{" "}
                                {formatNaira(product.price)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-card min-h-[300px]">
              <XCircle className="h-12 w-12 text-soraxi-green mb-4" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">
                No orders found
              </h3>
              <p className="mb-6 mt-2 text-sm text-muted-foreground">
                Your recent orders will appear here. Start shopping to see your
                history!
              </p>
              <Link href="/">
                <Button
                  size="lg"
                  className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
                >
                  Browse Products
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

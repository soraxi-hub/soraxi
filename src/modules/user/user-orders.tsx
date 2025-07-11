"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data: orders, isLoading } = useSuspenseQuery(
    trpc.order.getByUserId.queryOptions({ userId })
  );

  console.log("orders", orders);

  return (
    <main className="min-h-screen w-full">
      <Card className="bg-card rounded-lg shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl sm:text-2xl font-bold">
              Order History
            </CardTitle>
            <Badge className="bg-primary/10 text-primary text-sm sm:text-base">
              {orders.length} Orders
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {orders.length > 0 ? (
            <div className="grid gap-4 sm:gap-6">
              {orders.map((order) => (
                <Card key={order._id} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Order Date:{" "}
                        <time
                          dateTime={new Date(order.createdAt).toISOString()}
                        >
                          {new Date(order.createdAt).toLocaleDateString()}
                        </time>
                      </p>
                      <p className="text-lg font-bold">
                        Total: {formatNaira(order.totalAmount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Payment: {order.paymentStatus}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/orders/${order._id}`}>
                            View Details
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {order.subOrders.map((sub) => (
                    <div
                      key={sub.store._id}
                      className="border rounded-md p-4 space-y-3"
                    >
                      <h3 className="text-base font-semibold">
                        Store: {sub.store.name}
                      </h3>

                      {sub.products.map((product) => (
                        <div
                          key={product._id}
                          className="flex gap-4 items-center border-t pt-3"
                        >
                          <div className="relative w-24 h-24 shrink-0 rounded overflow-hidden border">
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
                          <div className="space-y-1">
                            <p className="font-medium">
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
                  ))}
                </Card>
              ))}
            </div>
          ) : (
            // ... (keep existing empty state)
            <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed shadow-xs h-[300px]">
              <div className="flex flex-col items-center gap-1 text-center p-8">
                <XCircle className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No orders found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Your recent orders will appear here
                </p>
                <Link href="/">
                  <Button size="sm">Browse Products</Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

/**

* OrderDetailsSkeleton
*
* Combined skeleton loader for:
* * OrderHeader
* * OrderSummary
* * StoreAccordion
*
* Designed with shadcn/ui components to maintain consistent styling.
  */
export function OrderDetailsSkeleton() {
  return (
    <div className="space-y-8 p-6">
      {/* ===== Header Section ===== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-32 rounded-md hidden sm:inline-block" />
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      {/* ===== Order Summary Section ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="bg-muted/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(2)].map((_, j) => (
                <div
                  key={j}
                  className="flex justify-between items-center py-2 border-b"
                >
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      {/* ===== Delivery Info Card ===== */}{" "}
      <Card className="bg-muted/50 md:col-span-2">
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Skeleton className="h-5 w-5 rounded-full" />{" "}
            <Skeleton className="h-5 w-32" />{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center py-2 border-b"
            >
              {" "}
              <Skeleton className="h-4 w-40" />{" "}
              <Skeleton className="h-4 w-24" />{" "}
            </div>
          ))}{" "}
        </CardContent>{" "}
      </Card>
      {/* ===== Store Accordion Skeleton ===== */}{" "}
      <Card className="bg-muted/50 rounded-lg shadow-xs">
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Skeleton className="h-5 w-5 rounded-full" />{" "}
            <Skeleton className="h-5 w-64" />{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="border rounded-lg p-4 space-y-4 bg-background"
            >
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <Skeleton className="h-5 w-5 rounded-full" />{" "}
                  <Skeleton className="h-5 w-40" />{" "}
                </div>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Skeleton className="h-4 w-4 rounded-full" />{" "}
                  <Skeleton className="h-5 w-24" />{" "}
                </div>{" "}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, j) => (
                  <div key={j} className="space-y-2">
                    {[...Array(2)].map((_, k) => (
                      <div
                        key={k}
                        className="flex justify-between items-center py-2 border-b"
                      >
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <Separator />
              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, p) => (
                  <Card
                    key={p}
                    className="border rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors"
                  >
                    <CardContent className="p-3 space-y-3">
                      <Skeleton className="h-32 w-full rounded-md" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex justify-between">
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-8 w-20 rounded-md" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

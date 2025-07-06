"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Truck, Shield, RotateCcw } from "lucide-react";
import { formatNaira } from "@/lib/utils/naira";

interface CartSummaryProps {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
  onCheckoutAction: () => void;
  isCheckingOut?: boolean;
}

export function CartSummary({
  subtotal,
  shipping,
  tax,
  discount,
  total,
  itemCount,
  onCheckoutAction,
  isCheckingOut = false,
}: CartSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatNaira(subtotal)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Shipping</span>
              <span>
                {shipping === 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    Free
                  </Badge>
                ) : (
                  `${formatNaira(shipping)}`
                )}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Tax</span>
              <span>{formatNaira(tax)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatNaira(discount)}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={onCheckoutAction}
            disabled={isCheckingOut || itemCount === 0}
          >
            {isCheckingOut
              ? "Processing..."
              : `Checkout (${formatNaira(total)})`}
          </Button>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 pt-4 text-center">
            <div className="flex flex-col items-center gap-1">
              <Shield className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Secure Payment</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Fast Delivery</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="h-4 w-4 text-orange-600" />
              <p className="text-xs text-muted-foreground">Easy Returns</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

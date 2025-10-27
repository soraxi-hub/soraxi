"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";

/**
 * CouponInput Component
 * Integrates with tRPC coupon router to validate/apply coupons in real-time.
 */
interface CouponInputProps {
  orderTotal: number;
  storeIds: string[];
  onCouponApplied?: (discount: number, code: string) => void;
}

export function CouponInput({
  orderTotal,
  storeIds,
  onCouponApplied,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trpc = useTRPC();

  const applyCouponMutation = useMutation(
    trpc.coupon.applyCoupon.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          setAppliedCoupon({
            code,
            discount: data.discount,
          });
          toast.success(data.message || "Coupon applied!");
          if (onCouponApplied) onCouponApplied(data.discount, code);
        }
      },
      onError: (err) => {
        const message =
          err.message || "Failed to apply coupon. Please check your code.";
        setError(message);
        toast.error(message);
      },
    })
  );

  async function handleApply() {
    if (!code.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setIsApplying(true);
    setError(null);

    applyCouponMutation.mutate({
      code: code.trim(),
      orderTotal,
      storeIds,
    });

    setIsApplying(false);
  }

  return (
    <div className="w-full space-y-2 mt-2">
      {/* Input Row */}
      <div className="flex space-x-2">
        <Input
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isApplying || !!appliedCoupon}
        />
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={isApplying || !code.trim() || !!appliedCoupon}
        >
          {isApplying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : appliedCoupon ? (
            "Applied"
          ) : (
            "Apply"
          )}
        </Button>
      </div>

      {/* Status Feedback */}
      {error && (
        <div className="flex items-center text-red-600 text-sm space-x-1">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {appliedCoupon && (
        <div className="flex items-center text-green-600 text-sm space-x-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Coupon <Badge variant="outline">{appliedCoupon.code}</Badge> applied{" "}
            – {formatNaira(appliedCoupon.discount)} off
          </span>
        </div>
      )}
    </div>
  );
}

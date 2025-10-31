"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CouponFormSchema,
  type CouponFormSchemaType,
  CouponSchemaWithIdType,
  CouponTypeEnum,
} from "@/validators/coupon-validations";

interface CouponFormProps {
  coupon?: CouponSchemaWithIdType;
  onSuccessAction: () => void;
}

export function CouponForm({ coupon, onSuccessAction }: CouponFormProps) {
  const trpc = useTRPC();
  const defaultDateVal = Date.now();

  const createMutation = useMutation(
    trpc.adminCoupon.createCoupon.mutationOptions({
      onSuccess: () => {
        toast.success("Coupon created successfully");
        onSuccessAction();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create coupon");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.adminCoupon.updateCoupon.mutationOptions({
      onSuccess: () => {
        toast.success("Coupon updated successfully");
        onSuccessAction();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update coupon");
      },
    })
  );

  const form = useForm<CouponFormSchemaType>({
    resolver: zodResolver(CouponFormSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          startDate: coupon.startDate,
          endDate: coupon.endDate,
          isActive: coupon.isActive,
          maxRedemptions: coupon.maxRedemptions,
          minOrderValue: coupon.minOrderValue,
          stackable: coupon.stackable,
        }
      : {
          type: CouponTypeEnum.Percentage,
          isActive: true,
          stackable: false,
          code: "",
          value: 0,
          startDate: new Date(defaultDateVal),
          endDate: new Date(defaultDateVal),
          maxRedemptions: 0,
          minOrderValue: 0,
        },
  });

  function onSubmit(data: CouponFormSchemaType) {
    const payload = {
      ...data,
      startDate: data.startDate,
      endDate: data.endDate,
    };

    if (coupon) {
      updateMutation.mutate({
        couponId: coupon._id,
        ...payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coupon Code</FormLabel>
              <FormControl>
                <Input placeholder="SUMMER20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={CouponTypeEnum.Percentage}>
                      Percentage
                    </SelectItem>
                    <SelectItem value={CouponTypeEnum.Fixed}>Fixed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Value {form.watch("type") === "percentage" ? "(%)" : "(₦)"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="20"
                    value={field.value ?? 0}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : 0
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().substring(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value
                        ? new Date(field.value).toISOString().substring(0, 10)
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxRedemptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Redemptions</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormDescription>Leave empty for unlimited</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minOrderValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Order Value (₦)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Leave empty for no minimum"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="mb-0">Active</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stackable"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="mb-0">
                  Stackable with other coupons
                </FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {coupon ? "Update Coupon" : "Create Coupon"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

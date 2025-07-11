"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  // DollarSign,
} from "lucide-react";
import { useStoreOnboarding } from "@/contexts/StoreOnboardingContext";
import type { ShippingMethodData } from "@/types/onboarding";
import { nairaToKobo } from "@/lib/utils/naira";

/**
 * Shipping Methods Form Schema
 * Validates shipping method configurations with pricing and delivery options
 */
const shippingMethodSchema = z.object({
  name: z.string().min(2, "Shipping method name must be at least 2 characters"),
  price: z.number().min(0, "Price must be 0 or greater"),
  estimatedDeliveryDays: z
    .number()
    .min(1, "Delivery time must be at least 1 day")
    .optional(),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional(),
  applicableRegions: z.array(z.string()).optional(),
  conditions: z
    .object({
      minOrderValue: z.number().min(0).optional(),
      maxOrderValue: z.number().min(0).optional(),
      minWeight: z.number().min(0).optional(),
      maxWeight: z.number().min(0).optional(),
    })
    .optional(),
});

const shippingMethodsFormSchema = z.object({
  shippingMethods: z
    .array(shippingMethodSchema)
    .min(1, "At least one shipping method is required")
    .max(10, "Maximum 10 shipping methods allowed"),
});

type ShippingMethodsFormData = z.infer<typeof shippingMethodsFormSchema>;

interface ShippingMethodsFormProps {
  onNextAction: () => void;
  onBackAction: () => void;
}

/**
 * Shipping Methods Form Component
 * Third step of onboarding - configures shipping options and pricing
 */
export function ShippingMethodsForm({
  onNextAction,
  onBackAction,
}: ShippingMethodsFormProps) {
  const { state, updateData, markStepCompleted } = useStoreOnboarding();
  const [expandedMethod, setExpandedMethod] = useState<number | null>(0);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
  } = useForm<ShippingMethodsFormData>({
    resolver: zodResolver(shippingMethodsFormSchema),
    defaultValues: {
      shippingMethods:
        state.data.shipping && state.data.shipping.length > 0
          ? state.data.shipping
          : [
              {
                name: "Standard Delivery",
                price: 0,
                estimatedDeliveryDays: 3,
                description: "Regular delivery within 3-5 business days",
                applicableRegions: [],
                conditions: {},
              },
            ],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "shippingMethods",
  });

  const watchedMethods = watch("shippingMethods");

  /**
   * Add a new shipping method with default values
   */
  const addShippingMethod = () => {
    append({
      name: "",
      price: 0,
      estimatedDeliveryDays: 3,
      description: "",
      applicableRegions: [],
      conditions: {},
    });
    setExpandedMethod(fields.length); // Expand the newly added method
  };

  /**
   * Remove a shipping method
   */
  const removeShippingMethod = (index: number) => {
    remove(index);
    if (expandedMethod === index) {
      setExpandedMethod(null);
    } else if (expandedMethod !== null && expandedMethod > index) {
      setExpandedMethod(expandedMethod - 1);
    }
  };

  /**
   * Handle form submission
   * Updates context data and proceeds to next step
   */
  const onSubmit = (data: ShippingMethodsFormData) => {
    const shippingData: ShippingMethodData[] = data.shippingMethods.map(
      (method) => ({
        name: method.name,
        price: nairaToKobo(method.price),
        estimatedDeliveryDays: method.estimatedDeliveryDays,
        description: method.description || undefined,
        applicableRegions: method.applicableRegions?.filter(Boolean) || [],
        conditions: {
          minOrderValue: method.conditions?.minOrderValue || undefined,
          maxOrderValue: method.conditions?.maxOrderValue || undefined,
          minWeight: method.conditions?.minWeight || undefined,
          maxWeight: method.conditions?.maxWeight || undefined,
        },
      })
    );

    updateData("shipping", shippingData);
    markStepCompleted("shipping");
    onNextAction();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          Configure Shipping Methods
        </h2>
        <p className="text-sm text-muted-foreground">
          Set up how you&apos;ll deliver products to your customers. You can add
          multiple shipping options with different pricing and delivery times.
        </p>
      </div>

      {/* Shipping Methods List */}
      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-soraxi-green/10 rounded-full flex items-center justify-center">
                    <Truck className="w-4 h-4 text-soraxi-green" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {watchedMethods[index]?.name ||
                        `Shipping Method ${index + 1}`}
                    </CardTitle>
                    <CardDescription>
                      {watchedMethods[index]?.price !== undefined && (
                        <span className="flex items-center space-x-1">
                          <span>₦</span>
                          <span>{watchedMethods[index].price}</span>
                          {watchedMethods[index]?.estimatedDeliveryDays && (
                            <>
                              <span className="mx-1">•</span>
                              <Clock className="w-3 h-3" />
                              <span>
                                {watchedMethods[index].estimatedDeliveryDays}{" "}
                                days
                              </span>
                            </>
                          )}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedMethod(expandedMethod === index ? null : index)
                    }
                  >
                    {expandedMethod === index ? "Collapse" : "Expand"}
                  </Button>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShippingMethod(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedMethod === index && (
              <CardContent className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`name-${index}`}
                      className="text-sm font-medium"
                    >
                      Method Name *
                    </Label>
                    <Input
                      id={`name-${index}`}
                      {...register(`shippingMethods.${index}.name`)}
                      placeholder="e.g., Standard Delivery, Express Shipping"
                      className={
                        errors.shippingMethods?.[index]?.name
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {errors.shippingMethods?.[index]?.name && (
                      <p className="text-sm text-destructive">
                        {errors.shippingMethods[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`price-${index}`}
                      className="text-sm font-medium"
                    >
                      Shipping Price (₦)*
                    </Label>
                    <Input
                      id={`price-${index}`}
                      type="number"
                      step="500"
                      min="0"
                      {...register(`shippingMethods.${index}.price`, {
                        valueAsNumber: true,
                      })}
                      placeholder="0.00"
                      className={
                        errors.shippingMethods?.[index]?.price
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {errors.shippingMethods?.[index]?.price && (
                      <p className="text-sm text-destructive">
                        {errors.shippingMethods[index]?.price?.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`delivery-${index}`}
                      className="text-sm font-medium"
                    >
                      Estimated Delivery (Days)
                    </Label>
                    <Input
                      id={`delivery-${index}`}
                      type="number"
                      min="1"
                      {...register(
                        `shippingMethods.${index}.estimatedDeliveryDays`,
                        { valueAsNumber: true }
                      )}
                      placeholder="3"
                      className={
                        errors.shippingMethods?.[index]?.estimatedDeliveryDays
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {errors.shippingMethods?.[index]?.estimatedDeliveryDays && (
                      <p className="text-sm text-destructive">
                        {
                          errors.shippingMethods[index]?.estimatedDeliveryDays
                            ?.message
                        }
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor={`regions-${index}`}
                      className="text-sm font-medium"
                    >
                      Applicable Regions
                    </Label>
                    <Input
                      id={`regions-${index}`}
                      {...register(
                        `shippingMethods.${index}.applicableRegions.0`
                      )}
                      placeholder="e.g., Lagos, Abuja, Port Harcourt"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to apply to all regions, or specify
                      cities/states
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label
                    htmlFor={`description-${index}`}
                    className="text-sm font-medium"
                  >
                    Description (Optional)
                  </Label>
                  <Textarea
                    id={`description-${index}`}
                    {...register(`shippingMethods.${index}.description`)}
                    placeholder="Describe this shipping method, delivery conditions, or special instructions"
                    rows={2}
                    className={
                      errors.shippingMethods?.[index]?.description
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {errors.shippingMethods?.[index]?.description && (
                    <p className="text-sm text-destructive">
                      {errors.shippingMethods[index]?.description?.message}
                    </p>
                  )}
                </div>

                {/* Advanced Conditions */}
                {/* <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Shipping Conditions (Optional)</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`min-order-${index}`} className="text-sm">
                        Minimum Order Value ($)
                      </Label>
                      <Input
                        id={`min-order-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(
                          `shippingMethods.${index}.conditions.minOrderValue`,
                          { valueAsNumber: true }
                        )}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`max-order-${index}`} className="text-sm">
                        Maximum Order Value ($)
                      </Label>
                      <Input
                        id={`max-order-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(
                          `shippingMethods.${index}.conditions.maxOrderValue`,
                          { valueAsNumber: true }
                        )}
                        placeholder="No limit"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`min-weight-${index}`}
                        className="text-sm"
                      >
                        Minimum Weight (kg)
                      </Label>
                      <Input
                        id={`min-weight-${index}`}
                        type="number"
                        step="0.1"
                        min="0"
                        {...register(
                          `shippingMethods.${index}.conditions.minWeight`,
                          { valueAsNumber: true }
                        )}
                        placeholder="0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor={`max-weight-${index}`}
                        className="text-sm"
                      >
                        Maximum Weight (kg)
                      </Label>
                      <Input
                        id={`max-weight-${index}`}
                        type="number"
                        step="0.1"
                        min="0"
                        {...register(
                          `shippingMethods.${index}.conditions.maxWeight`,
                          { valueAsNumber: true }
                        )}
                        placeholder="No limit"
                      />
                    </div>
                  </div>
                </div> */}
              </CardContent>
            )}
          </Card>
        ))}

        {/* Add New Shipping Method */}
        {fields.length < 10 && (
          <Button
            type="button"
            variant="outline"
            onClick={addShippingMethod}
            className="w-full border-dashed border-2 h-16 text-muted-foreground hover:text-foreground hover:border-soraxi-green"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Another Shipping Method
          </Button>
        )}
      </div>

      {/* Form Errors */}
      {errors.shippingMethods && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive font-medium">
            Please fix the following errors:
          </p>
          <ul className="text-sm text-destructive mt-2 space-y-1">
            {typeof errors.shippingMethods.message === "string" && (
              <li>• {errors.shippingMethods.message}</li>
            )}
          </ul>
        </div>
      )}

      {/* Shipping Tips */}
      <div className="bg-soraxi-green/5 border border-soraxi-green/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-soraxi-green mb-2">
          💡 Shipping Tips
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            • Offer multiple shipping options to cater to different customer
            needs
          </li>
          <li>• Consider free shipping for orders above a certain amount</li>
          <li>
            • Be realistic with delivery timeframes to set proper expectations
          </li>
          <li>
            • Factor in packaging and handling time when setting delivery
            estimates
          </li>
        </ul>
      </div>

      {/* Form Actions */}
      <div className="flex justify-between pt-6 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onBackAction}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
        >
          Continue to Payout Setup
        </Button>
      </div>
    </form>
  );
}

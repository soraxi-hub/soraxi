"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { cn } from "@/lib/utils";
import { addNairaSign, koboToNaira, nairaToKobo } from "@/lib/utils/naira";
import { useTRPC } from "@/trpc/client";
import { shippingMethodSchema } from "@/validators/store-validators";
import {
  MIN_DELIVERY_DAYS,
  MIN_SHIPPING_DESCRIPTION_LENGTH,
} from "@/constants/shipping.constants";

import { pageCardLg, pageGutter } from "../components/page-card.styles";
import { Badge } from "@/components/ui/badge";

/**
 * A store offers one delivery option, so this form never touches
 * `applicableRegions`/`conditions` — the server-side schema has them for the
 * future, but nothing here collects them yet.
 */
const formSchema = shippingMethodSchema.pick({
  id: true,
  name: true,
  price: true,
  estimatedDeliveryDays: true,
  isActive: true,
  description: true,
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_FORM: FormValues = {
  name: "",
  price: 0,
  estimatedDeliveryDays: MIN_DELIVERY_DAYS,
  isActive: false,
  description: "",
};

/**
 * Delivery configuration for a store.
 */
export default function ShippingMethodForm() {
  const trpc = useTRPC();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: shippingMethods, refetch: refetchShippingMethods } =
    useSuspenseQuery(trpc.storeShipping.getStoreShippingMethods.queryOptions());

  const saved = shippingMethods?.[0] ?? null;
  const hasOption = Boolean(saved);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_FORM,
    mode: "onChange",
  });

  /**
   * Seed the form from whatever is saved.
   *
   * Prices arrive in kobo and are edited in naira — the conversion belongs here
   * rather than in the input, so the form only ever deals in one unit.
   */
  useEffect(() => {
    if (!saved) return;

    form.reset({
      id: saved.id,
      name: saved.name,
      price: koboToNaira(saved.price),
      estimatedDeliveryDays: saved.estimatedDeliveryDays,
      isActive: saved.isActive ?? false,
      description: saved.description ?? "",
    });
  }, [saved, form]);

  const update = useMutation(
    trpc.storeShipping.handleStoreShippingMethodUpdate.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Delivery option saved");
        refetchShippingMethods();
        setIsSubmitting(false);
      },
      onError: (error) => {
        toast.error(error.message || "Could not save your delivery option");
        setIsSubmitting(false);
      },
    }),
  );

  const onSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    update.mutate({
      ...values,
      price: nairaToKobo(values.price),
      applicableRegions: [],
    });
  };

  // Drives the live preview. Watching the whole form is fine here — it is a
  // handful of fields and the preview must track every keystroke.
  const preview = form.watch();
  const description = form.watch("description") ?? "";

  return (
    <div className={cn("mx-auto w-full max-w-3xl space-y-6 py-6", pageGutter)}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Delivery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One delivery option per store, for now.
          </p>
        </div>

        {hasOption && (
          <Badge
            className={cn(
              "shrink-0",
              saved?.isActive
                ? "bg-soraxi-green text-white"
                : "bg-muted text-muted-foreground",
            )}
          >
            {saved?.isActive ? "On" : "Off"}
          </Badge>
        )}
      </header>

      {!hasOption && <NoOptionYet />}

      <SoraxiCard className={pageCardLg}>
        <SoraxiCardHeader>
          <SoraxiCardTitle>
            {hasOption ? "Your delivery option" : "Set up delivery"}
          </SoraxiCardTitle>
          <SoraxiCardDescription className="mt-1 text-muted-foreground">
            Customers see this at checkout and pay it on top of the item price.
          </SoraxiCardDescription>
        </SoraxiCardHeader>

        <SoraxiCardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      What to call it{" "}
                      <span className="text-soraxi-error">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Hostel delivery" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Delivery fee{" "}
                        <span className="text-soraxi-error">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                            ₦
                          </span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            step="50"
                            min={0}
                            placeholder="500"
                            className="pl-7"
                            value={Number.isNaN(field.value) ? "" : field.value}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value === ""
                                  ? Number.NaN
                                  : Number(event.target.value),
                              )
                            }
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Enter 0 for free delivery.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDeliveryDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Days to arrive{" "}
                        <span className="text-soraxi-error">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={MIN_DELIVERY_DAYS}
                          placeholder={String(MIN_DELIVERY_DAYS)}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ""
                                ? Number.NaN
                                : Number(event.target.value),
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum {MIN_DELIVERY_DAYS} day
                        {MIN_DELIVERY_DAYS === 1 ? "" : "s"}.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-baseline justify-between gap-2">
                      <FormLabel>
                        What customers should know{" "}
                        <span className="text-soraxi-error">*</span>
                      </FormLabel>
                      {/* Counts up to the minimum rather than down from a
                          maximum — the constraint here is writing enough. */}
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          description.length >= MIN_SHIPPING_DESCRIPTION_LENGTH
                            ? "text-soraxi-green"
                            : "text-muted-foreground",
                        )}
                      >
                        {description.length}/{MIN_SHIPPING_DESCRIPTION_LENGTH} min
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        rows={4}
                        className="resize-none"
                        placeholder="Where you deliver, cut-off times, anything customers should expect."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Offer this option</FormLabel>
                      <FormDescription>
                        Turn off to pause orders without deleting the setup.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-soraxi-green text-white hover:bg-soraxi-green-hover"
              >
                {isSubmitting
                  ? "Saving..."
                  : hasOption
                    ? "Save changes"
                    : "Create delivery option"}
              </Button>
            </form>
          </Form>
        </SoraxiCardContent>
      </SoraxiCard>

      <CheckoutPreview
        name={preview.name}
        price={preview.price}
        days={preview.estimatedDeliveryDays}
        description={preview.description}
        isActive={Boolean(preview.isActive)}
      />

      <FeeGuidance />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function NoOptionYet() {
  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardContent className="py-8 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-soraxi-green/10">
          <Truck className="size-5 text-soraxi-green" aria-hidden />
        </span>
        <p className="font-semibold">No delivery option yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Tell Customers what you charge and how long delivery takes. You can
          change it any time.
        </p>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

/**
 * The option exactly as a student sees it at checkout.
 *
 * Rendered from the live form rather than the saved record, so a vendor sees
 * the consequence of a change before committing to it.
 */
function CheckoutPreview({
  name,
  price,
  days,
  description,
  isActive,
}: {
  name?: string;
  price?: number;
  days?: number;
  description?: string;
  isActive: boolean;
}) {
  const hasPrice = typeof price === "number" && !Number.isNaN(price);
  const hasDays = typeof days === "number" && !Number.isNaN(days);

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <SoraxiCardTitle>How customers see it</SoraxiCardTitle>
        <SoraxiCardDescription className="mt-1 text-muted-foreground">
          Your option at checkout, exactly as it appears.
        </SoraxiCardDescription>
      </SoraxiCardHeader>

      <SoraxiCardContent className="space-y-2">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-soraxi-green"
              aria-hidden
            >
              <span className="size-1.5 rounded-full bg-soraxi-green" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-medium">
                  {name?.trim() || "Delivery option"}
                </p>
                <p className="shrink-0 text-sm font-semibold">
                  {/* `addNairaSign`, not `formatNaira` — the form holds naira
                      and `formatNaira` expects kobo, so it would show a
                      hundredth of the real fee. */}
                  {hasPrice && price > 0 ? addNairaSign(price) : "Free"}
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Arrives in {hasDays ? days : "—"} days
              </p>

              {description?.trim() && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {!isActive && (
          <p className="text-xs text-soraxi-error">
            Turned off — customers can&apos;t check out until one option is on.
          </p>
        )}
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

function FeeGuidance() {
  const points = [
    "Include packaging and the trip to the hostel, not just transport.",
    "Be honest about days. Late deliveries are the most common complaint.",
    "You keep the delivery fee in full; the platform fee applies to the item total only.",
  ];

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <SoraxiCardTitle>Setting a fee</SoraxiCardTitle>
      </SoraxiCardHeader>
      <SoraxiCardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span
                className="mt-2 size-1 shrink-0 rounded-full bg-soraxi-green"
                aria-hidden
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatNaira } from "@/lib/utils/naira";
import { Truck, ShoppingBag } from "lucide-react";
import { ProductItem } from "./product-item";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import type { ShippingMethod } from "@/types";
import { ProductTypeEnum } from "@/validators/product-validators";

type CheckoutOutput = inferProcedureOutput<
  AppRouter["checkout"]["getGroupedCart"]
>;
type GroupedCart = NonNullable<CheckoutOutput>["groupedCart"][number];

interface StoreCartGroupProps {
  storeGroup: GroupedCart;
  onShippingMethodChangeAction: (method: ShippingMethod) => void;
  selectedShippingMethod: ShippingMethod | undefined;
}

/** Displays products from a single store with shipping options */
export default function StoreCartGroup({
  storeGroup,
  onShippingMethodChangeAction,
  selectedShippingMethod,
}: StoreCartGroupProps) {
  /**
   * Product Type Analysis
   *
   * Determine if this store group contains physical products that require shipping.
   * This analysis drives the conditional display of shipping options.
   */
  const hasPhysicalProducts = storeGroup.products.some(
    (product) => product.productType === ProductTypeEnum.Product
  );

  /**
   * Shipping Method Selection Handler
   *
   * Processes shipping method selection and triggers parent callback.
   * Includes validation to ensure the selected method exists.
   *
   * @param methodName - Name identifier of the selected shipping method
   */
  const handleShippingMethodChange = (methodName: string) => {
    const selectedMethod = storeGroup.shippingMethods?.find(
      (method) => method.name === methodName
    );

    if (selectedMethod) {
      onShippingMethodChangeAction(selectedMethod);
    }
  };

  /**
   * Shipping Options Availability Check
   *
   * Determines whether to show shipping options based on:
   * - Presence of physical products
   * - Availability of shipping methods from the store
   */
  const shouldShowShippingOptions =
    hasPhysicalProducts &&
    storeGroup.shippingMethods &&
    storeGroup.shippingMethods.length > 0;

  return (
    <Card className="overflow-hidden border-soraxi-green/30 transition-shadow hover:shadow-md">
      {/* Store Header */}
      <CardHeader className="bg-muted/30 border-b border-soraxi-green/20">
        <CardTitle className="text-xl flex items-center gap-3 min-w-0">
          <ShoppingBag className="h-5 w-5 text-soraxi-green flex-shrink-0" />
          <span className="truncate flex-1">{storeGroup.storeName}</span>
          <span className="text-sm font-normal text-muted-foreground ml-auto whitespace-nowrap">
            {storeGroup.products.length} item
            {storeGroup.products.length > 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        {/* Products List */}
        <div
          className="space-y-4 overflow-hidden"
          role="list"
          aria-label={`Products from ${storeGroup.storeName}`}
        >
          {storeGroup.products.map((item, index) => (
            <div key={`${item.storeId}-${index}`} role="listitem">
              <ProductItem item={item} />
            </div>
          ))}
        </div>

        {/* Shipping Methods Section */}
        {shouldShowShippingOptions && (
          <>
            <Separator className="my-6 border-soraxi-green/30" />

            <Accordion
              type="single"
              collapsible
              defaultValue="shipping-methods"
            >
              <AccordionItem value="shipping-methods" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline hover:bg-muted/50 rounded-md px-2 transition-colors">
                  <div className="flex items-center gap-3 truncate">
                    <Truck className="h-4 w-4 text-soraxi-green hidden sm:inline-flex flex-shrink-0" />
                    <span className="font-medium truncate">
                      Shipping Options
                    </span>
                    {selectedShippingMethod && (
                      <span className="ml-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md truncate">
                        {selectedShippingMethod.name}:{" "}
                        {formatNaira(selectedShippingMethod.price)}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-4">
                  <fieldset>
                    <legend className="sr-only">
                      Select shipping method for {storeGroup.storeName}
                    </legend>

                    <RadioGroup
                      value={selectedShippingMethod?.name || ""}
                      onValueChange={handleShippingMethodChange}
                      className="space-y-3"
                    >
                      {storeGroup.shippingMethods.map((method) => (
                        <div
                          key={method.name}
                          className="flex items-center space-x-3 rounded-lg border p-4 hover:border-soraxi-green/50 hover:bg-muted/30 transition-colors overflow-hidden"
                        >
                          <RadioGroupItem
                            value={method.name}
                            id={`shipping-${storeGroup.storeId}-${method.name}`}
                            className="text-soraxi-green flex-shrink-0"
                          />
                          <Label
                            htmlFor={`shipping-${storeGroup.storeId}-${method.name}`}
                            className="flex flex-1 justify-between cursor-pointer gap-3 min-w-0"
                          >
                            <div className="space-y-1 overflow-hidden">
                              <div className="font-medium text-foreground truncate">
                                {method.name}
                              </div>

                              {method.estimatedDeliveryDays && (
                                <p className="text-sm text-muted-foreground truncate">
                                  Estimated delivery:{" "}
                                  {method.estimatedDeliveryDays} day
                                  {method.estimatedDeliveryDays > 1 ? "s" : ""}
                                </p>
                              )}

                              {method.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {method.description}
                                </p>
                              )}
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className="font-semibold text-foreground whitespace-nowrap">
                                {formatNaira(method.price)}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </fieldset>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}

        {/* No Shipping Required Message */}
        {hasPhysicalProducts &&
          (!storeGroup.shippingMethods ||
            storeGroup.shippingMethods.length === 0) && (
            <>
              <Separator className="my-6 border-soraxi-green/30" />
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 overflow-hidden">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800 font-medium truncate">
                    Shipping methods not available for this store
                  </p>
                </div>
                <p className="text-xs text-amber-700 mt-1 truncate">
                  Please contact the store directly for shipping arrangements
                </p>
              </div>
            </>
          )}

        {/* Digital Products Only Message */}
        {!hasPhysicalProducts && (
          <>
            <Separator className="my-6 border-soraxi-green/30" />
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 overflow-hidden">
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-blue-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-blue-800 font-medium truncate">
                  Digital products - No shipping required
                </p>
              </div>
              <p className="text-xs text-blue-700 mt-1 truncate">
                These items will be available for download after payment
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeliveryType } from "@/enums";
import { PublicToJSONUserType } from "@/domain/users/user-interface";
import {
  AlertTriangle,
  InfoIcon,
  MapPin,
  PhoneIcon,
  UserIcon,
} from "lucide-react";

export const campusLocations = [
  "Main Gate",
  "Unical Library (E-Library)",
  "Hostel Area",
];

interface ShippingInformationSectionProps {
  userData: PublicToJSONUserType;
  deliveryType: DeliveryType;
  handleDeliveryTypeChangeAction: (val: DeliveryType) => void;
}

export function ShippingInformationSection({
  userData,
  deliveryType,
  handleDeliveryTypeChangeAction,
}: ShippingInformationSectionProps) {
  /**
   * Shipping Information Completeness Check
   *
   * Verify that all required shipping information is available
   * to prevent order placement with incomplete data.
   */
  const hasCompleteShippingInfo =
    userData.firstName &&
    userData.lastName &&
    userData.address &&
    userData.phoneNumber &&
    userData.city &&
    userData.state;

  return (
    <Accordion type="single" collapsible defaultValue="shipping-info">
      <AccordionItem value="shipping-info" className="border-none">
        <AccordionTrigger className="group px-6 py-4 hover:no-underline hover:bg-muted/30 rounded-t-lg transition-colors">
          <div className="flex items-center space-x-3">
            <MapPin className="h-5 w-5 text-soraxi-green flex-shrink-0" />

            <CardTitle className="text-base font-semibold text-foreground">
              Shipping Information
            </CardTitle>

            {!hasCompleteShippingInfo && (
              <Badge variant="destructive" className="ml-2">
                Incomplete
              </Badge>
            )}
          </div>
        </AccordionTrigger>

        <AccordionContent>
          <CardContent className="px-6 py-0 bg-muted/20">
            <div className="space-y-4">
              {hasCompleteShippingInfo ? (
                <>
                  {/* Delivery Type */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        Where should we deliver?
                      </label>

                      <Popover>
                        <PopoverTrigger asChild>
                          <InfoIcon className="w-4 h-4 text-muted-foreground cursor-pointer" />
                        </PopoverTrigger>

                        <PopoverContent className="max-w-xs text-sm dark:bg-muted">
                          <p>
                            Choose where you'd like your order delivered.
                            <br />
                            <strong>Campus/Within Campus:</strong> Delivered to
                            a location within your school campus (e.g. Main
                            Gate, Unical E-Library).
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Select
                      value={deliveryType}
                      onValueChange={(value: DeliveryType) =>
                        handleDeliveryTypeChangeAction(value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose where you'd like your order delivered" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="campus">Within Campus</SelectItem>
                        <SelectItem value="off-campus">
                          Outside Campus
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Customer Name */}
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />

                    <span className="font-medium text-foreground">
                      {userData.firstName} {userData.lastName}
                    </span>
                  </div>

                  {/* Phone Number */}
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />

                    <span className="text-foreground">
                      {userData.phoneNumber}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />

                    <div className="space-y-1">
                      {deliveryType === DeliveryType.OffCampus ? (
                        <>
                          <p className="text-foreground leading-relaxed">
                            {userData.address}
                          </p>

                          <p className="text-muted-foreground text-sm">
                            {userData.city}, {userData.state}
                            {userData.postalCode && ` ${userData.postalCode}`}
                          </p>
                        </>
                      ) : (
                        <ul className="text-muted-foreground text-sm list-disc ml-5">
                          {campusLocations.map((location) => (
                            <li key={location}>{location}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />

                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Incomplete Shipping Information
                    </p>

                    <p className="text-xs text-amber-700 mt-1">
                      Please update your profile with complete shipping details
                      before placing your order.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

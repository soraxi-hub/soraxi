"use client";

import { Mail, Phone, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageAboutOrderButton } from "@/modules/messaging/components/message-about-order-button";

interface CustomerInformationCardProps {
  name: string;
  email?: string;
  phoneNumber?: string;
  subOrderId: string;
  storeId: string;
}

/**
 * Who the vendor is delivering to, and how to reach them.
 *
 * Contact details are real links — `mailto:` and `tel:` — because a vendor
 * chasing a delivery on a phone should be one tap from calling, not
 * copy-pasting a number out of a table.
 *
 * The "Message customer" action is given equal weight to the raw contact
 * details on purpose. A conversation on Soraxi is timestamped, immutable and
 * readable by a moderator if the order is later disputed; a phone call leaves
 * nothing behind. The note underneath says exactly that, so choosing the
 * platform channel feels like the informed option rather than the slow one.
 */
export function CustomerInformationCard({
  name,
  email,
  phoneNumber,
  subOrderId,
  storeId,
}: CustomerInformationCardProps) {
  return (
    <Card>
      <CardHeader className="px-4 pb-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4 text-muted-foreground" aria-hidden />
          Customer information
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 px-4 sm:px-6">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm">
            <User className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 truncate font-medium">{name}</span>
          </p>

          {email && (
            <p className="flex items-center gap-2 text-sm">
              <Mail
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <a
                href={`mailto:${email}`}
                className="min-w-0 truncate text-soraxi-green hover:underline"
              >
                {email}
              </a>
            </p>
          )}

          {phoneNumber && (
            <p className="flex items-center gap-2 text-sm">
              <Phone
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <a
                href={`tel:${phoneNumber}`}
                className="min-w-0 truncate text-soraxi-green hover:underline"
              >
                {phoneNumber}
              </a>
            </p>
          )}
        </div>

        <MessageAboutOrderButton
          subOrderId={subOrderId}
          role="vendor"
          storeId={storeId}
          label="Message customer"
        />

        <p className="text-xs text-muted-foreground">
          Messages stay on Soraxi and are attached to this sub-order.
        </p>
      </CardContent>
    </Card>
  );
}

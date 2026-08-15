"use client";

import { Info } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { Button } from "@/components/ui/button";

import { pageCardLg } from "../../components/page-card.styles";

interface SettingsTabProps {
  storeName: string;
  storeEmail: string;
  uniqueId: string;
  onEditName: () => void;
}

/**
 * Store settings.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS AND ISN'T EDITABLE, AND WHY
 * ─────────────────────────────────────────────────────────────────────────────
 * Only the store name can be changed here — it is the one field with a backing
 * mutation (`handleStoreNameUpdate`).
 *
 * Email and store ID are shown read-only *by design*: the ID appears in public
 * URLs and order references, and the email is the account's identity. Both are
 * a support conversation, not a text box.
 *
 * **Campus** and **Accept new orders** appear in the design but have nothing
 * behind them — the store model has no institution field and no
 * accepting-orders flag. They are rendered disabled with an honest explanation
 * rather than as controls that silently do nothing, which is the worse failure:
 * a vendor who "pauses" their store and keeps taking orders has been actively
 * misled. Both need a schema decision before they can work.
 */
export function SettingsTab({
  storeName,
  storeEmail,
  uniqueId,
  onEditName,
}: SettingsTabProps) {
  return (
    <div className="space-y-4">
      <SoraxiCard className={pageCardLg}>
        <SoraxiCardHeader>
          <SoraxiCardTitle>Store details</SoraxiCardTitle>
          <SoraxiCardDescription className="mt-1 text-muted-foreground">
            Your email and store ID are fixed. Contact support to change them.
          </SoraxiCardDescription>
        </SoraxiCardHeader>

        <SoraxiCardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="settings-store-name">Store name</Label>
              <Input
                id="settings-store-name"
                value={storeName}
                readOnly
                onClick={onEditName}
                className="cursor-pointer"
              />
              <Button
                type="button"
                variant="link"
                onClick={onEditName}
                className="h-auto p-0 text-xs text-soraxi-green"
              >
                Change store name
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-store-email">Store email</Label>
              <Input
                id="settings-store-email"
                value={storeEmail}
                readOnly
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-store-id">Store ID</Label>
              <Input
                id="settings-store-id"
                value={uniqueId}
                readOnly
                disabled
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="settings-campus">Campus</Label>
              <Input
                id="settings-campus"
                value=""
                placeholder="Not set"
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Not stored yet — coming with campus support.
              </p>
            </div>
          </div>
        </SoraxiCardContent>
      </SoraxiCard>

      <SoraxiCard className={pageCardLg}>
        <SoraxiCardHeader>
          <SoraxiCardTitle>Store visibility</SoraxiCardTitle>
          <SoraxiCardDescription className="mt-1 text-muted-foreground">
            Pause your store when you travel or run out of stock. Existing
            orders are unaffected.
          </SoraxiCardDescription>
        </SoraxiCardHeader>

        <SoraxiCardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="accept-orders" className="text-sm">
              Accept new orders
            </Label>
            <Switch id="accept-orders" checked disabled />
          </div>

          {/*
            Disabled rather than wired to nothing. A vendor who flips this and
            keeps receiving orders would be worse off than one who can see it
            isn't available yet.
          */}
          <p className="flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Pausing isn&apos;t available yet. To stop selling for now, hide
              your products from the Products tab.
            </span>
          </p>
        </SoraxiCardContent>
      </SoraxiCard>
    </div>
  );
}

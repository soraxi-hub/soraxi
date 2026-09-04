"use client";

import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ShareChannelButtons } from "@/components/share/share-channel-buttons";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

interface ShareStorePromptCardProps {
  storeId: string;
  storeName: string;
  className?: string;
}

/**
 * Nudges a vendor to post their own store link on their own social
 * channels — often the fastest route to a first sale, since it reaches
 * people who already know and trust the vendor.
 *
 * Shown on the dashboard and the products page, so it stays visible without
 * needing its own destination.
 */
export function ShareStorePromptCard({
  storeId,
  storeName,
  className,
}: ShareStorePromptCardProps) {
  const storeUrl = `${siteConfig.url}/brand/${storeId}`;
  const shareText = `Check out my store, ${storeName}, on ${siteConfig.name}!`;

  return (
    <Card className={cn("border-soraxi-green/30 bg-soraxi-green/5", className)}>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Megaphone className="mt-0.5 size-5 shrink-0 text-soraxi-green hidden md:inline-flex" />
          <div>
            <p className="font-semibold">Let your customers know you're here</p>
            <p className="text-sm text-muted-foreground">
              Share your store link on WhatsApp, X, or Facebook. Vendors who
              share their store with their own audience tend to see their first
              order come in faster.
            </p>
          </div>
        </div>

        <ShareChannelButtons
          url={storeUrl}
          text={shareText}
          className="shrink-0 sm:ml-4"
        />
      </CardContent>
    </Card>
  );
}

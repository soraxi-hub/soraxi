"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Package,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  StorefrontStoreView,
  StoreStatusTone,
} from "@/domain/stores/store-profile-manager-public";

interface StoreIdentityCardProps {
  store: StorefrontStoreView;
}

const STATUS_TONE_CLASS: Record<StoreStatusTone, string> = {
  success: "bg-soraxi-success text-white",
  // The warning token is a bright yellow; it needs dark text to stay legible.
  warning: "bg-soraxi-warning text-black",
  danger: "bg-soraxi-error text-white",
};

const STATUS_TONE_ICON: Record<StoreStatusTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: Clock,
  danger: AlertCircle,
};

/**
 * Five stars with the filled portion reflecting the rating.
 *
 * Decorative: the numeric rating and review count sit beside it in text, so the
 * stars are hidden from assistive tech rather than duplicated as labels.
 */
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function StoreStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

/**
 * A CTA that is designed but not yet wired to a backend.
 *
 * Shown disabled with a tooltip rather than hidden, so the layout is final and
 * turning the feature on later is a one-line change here.
 */
function ComingSoonAction({
  children,
  variant,
  className,
}: {
  children: React.ReactNode;
  variant: "default" | "outline";
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* Wrapper span: a disabled button emits no pointer events, so the
            tooltip would never open without something to hover. */}
        <span className="block w-full">
          <Button
            variant={variant}
            disabled
            className={cn("w-full", className)}
            aria-disabled
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Coming soon</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The storefront's identity column: who this vendor is, how they're rated, and
 * the actions a shopper can take on the store itself.
 *
 * Full-width on mobile, a sticky sidebar from `lg` up.
 */
export function StoreIdentityCard({ store }: StoreIdentityCardProps) {
  const StatusIcon = STATUS_TONE_ICON[store.statusTone];

  const handleShareStore = async () => {
    const storeUrl = `${window.location.origin}/brand/${store.storeId}`;

    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Store link copied to clipboard!");
    } catch {
      // Clipboard access is denied in some mobile browsers and on non-secure
      // origins; failing silently would look like a broken button.
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-6 px-4 sm:px-6">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <Avatar className="size-14 shrink-0 sm:size-16">
            <AvatarFallback className="bg-soraxi-green text-lg font-semibold text-white">
              {store.initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight break-words sm:text-3xl">
              {store.storeName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn("gap-1", STATUS_TONE_CLASS[store.statusTone])}
          >
            <StatusIcon className="size-3" aria-hidden />
            {store.statusLabel}
          </Badge>
        </div>

        {/* Rating */}
        <div className="flex flex-wrap items-center gap-2">
          <RatingStars rating={store.averageRating} />
          <span className="text-base font-semibold">
            {store.averageRating.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">
            ({store.reviewCount.toLocaleString()}{" "}
            {store.reviewCount === 1 ? "review" : "reviews"})
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <StoreStat
            icon={CalendarDays}
            label="Member since"
            value={store.memberSince}
          />
          <StoreStat
            icon={Package}
            label="Orders fulfilled"
            value={store.ordersFulfilled.toLocaleString()}
          />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <ComingSoonAction
            variant="default"
            className="bg-soraxi-green text-white hover:bg-soraxi-green-hover"
          >
            Follow store
          </ComingSoonAction>

          <ComingSoonAction variant="outline">Message vendor</ComingSoonAction>

          <Button
            variant="ghost"
            onClick={handleShareStore}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Share store
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

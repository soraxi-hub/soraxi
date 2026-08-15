"use client";

import Link from "next/link";
import { CreditCard, Package, Pencil, Plus, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { cn } from "@/lib/utils";

import { pageCardLg } from "../../components/page-card.styles";
import { statusBadgeClass, type StoreStatusView } from "../store-status";

interface OverviewTabProps {
  storeId: string;
  description: string;
  storeEmail: string;
  memberSince: string;
  isVerified: boolean;
  status: StoreStatusView;
  onEditDescription: () => void;
}

export function OverviewTab({
  storeId,
  description,
  storeEmail,
  memberSince,
  isVerified,
  status,
  onEditDescription,
}: OverviewTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <WhatCustomersSee description={description} onEdit={onEditDescription} />

      <div className="space-y-4">
        <QuickActions storeId={storeId} />
        <AccountCard
          status={status}
          isVerified={isVerified}
          storeEmail={storeEmail}
          memberSince={memberSince}
        />
      </div>
    </div>
  );
}

/** The public description, shown as the shopper reads it. */
function WhatCustomersSee({
  description,
  onEdit,
}: {
  description: string;
  onEdit: () => void;
}) {
  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SoraxiCardTitle>What customers see</SoraxiCardTitle>
            <SoraxiCardDescription className="mt-1 text-muted-foreground">
              The description on your public store page.
            </SoraxiCardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="shrink-0 gap-1.5"
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
      </SoraxiCardHeader>

      <SoraxiCardContent>
        {description.trim() ? (
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {description}
          </p>
        ) : (
          /* Not a neutral empty state — an empty description costs the vendor
             sales, so it reads as something to fix. */
          <p className="text-sm text-muted-foreground">
            You haven&apos;t written one yet. Customers are far more likely to
            buy from a store that explains what it sells.
          </p>
        )}
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

function QuickActions({ storeId }: { storeId: string }) {
  const actions = [
    {
      label: "Add a product",
      href: `/store/${storeId}/products/upload`,
      icon: Plus,
    },
    {
      label: "Orders to fulfil",
      href: `/store/${storeId}/orders`,
      icon: Package,
    },
    {
      label: "Payout account",
      href: `/store/${storeId}/payment-setup`,
      icon: CreditCard,
    },
    {
      label: "Delivery option",
      href: `/store/${storeId}/shipping`,
      icon: Truck,
    },
  ];

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <SoraxiCardTitle>Quick actions</SoraxiCardTitle>
      </SoraxiCardHeader>

      <SoraxiCardContent className="space-y-2">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            asChild
            className="w-full justify-start gap-2"
          >
            <Link href={action.href}>
              <action.icon className="size-4" />
              {action.label}
            </Link>
          </Button>
        ))}
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

function AccountCard({
  status,
  isVerified,
  storeEmail,
  memberSince,
}: {
  status: StoreStatusView;
  isVerified: boolean;
  storeEmail: string;
  memberSince: string;
}) {
  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <SoraxiCardTitle>Account</SoraxiCardTitle>
      </SoraxiCardHeader>

      <SoraxiCardContent className="space-y-3 text-sm">
        <Row label="Store status">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              statusBadgeClass[status.tone],
            )}
          >
            {status.accountLabel}
          </span>
        </Row>

        <Row label="Verification">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-xs font-medium",
              isVerified
                ? "bg-muted text-foreground"
                : "bg-soraxi-warning/20 text-yellow-700 dark:text-soraxi-warning",
            )}
          >
            {isVerified ? "Verified" : "Pending"}
          </span>
        </Row>

        <Row label="Store email">
          <span className="truncate text-soraxi-green">{storeEmail}</span>
        </Row>

        <Row label="Member since">
          <span className="font-medium">{memberSince}</span>
        </Row>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

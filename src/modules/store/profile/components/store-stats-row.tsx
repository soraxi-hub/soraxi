"use client";

import { CalendarDays, Package, Truck, Users } from "lucide-react";

interface StoreStatsRowProps {
  followers: number;
  products: number;
  ordersFulfilled: number;
  memberSince: string;
}

const ICONS = [Users, Package, Truck, CalendarDays] as const;

/**
 * The four numbers an owner glances at.
 *
 * Two columns on a phone rather than four: four columns at 360px squeezes
 * "Orders fulfilled" onto three lines and the figures stop being scannable,
 * which is the only reason this row exists.
 */
export function StoreStatsRow({
  followers,
  products,
  ordersFulfilled,
  memberSince,
}: StoreStatsRowProps) {
  const stats = [
    { label: "Followers", value: followers.toLocaleString() },
    { label: "Products", value: products.toLocaleString() },
    { label: "Orders fulfilled", value: ordersFulfilled.toLocaleString() },
    { label: "Member since", value: memberSince },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = ICONS[index];

        return (
          <div key={stat.label} className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{stat.label}</span>
            </p>
            <p className="mt-0.5 truncate text-lg font-bold">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

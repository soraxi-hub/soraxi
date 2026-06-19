"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

type DateRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "all_time"
  | "custom";

function AdminFinancialMetrics() {
  const trpc = useTRPC();

  const [dateRange, setDateRange] = useState<DateRangePreset>("last_7_days");

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isCustomRangeValid =
    dateRange !== "custom" || (!!customFrom && !!customTo);

  const queryInput =
    dateRange === "custom" && customFrom && customTo
      ? {
          preset: "custom" as const,
          customFrom: new Date(customFrom).toISOString(),
          customTo: new Date(customTo).toISOString(),
        }
      : {
          preset: dateRange === "custom" ? "last_7_days" : dateRange,
        };

  const { data, isLoading } = useQuery({
    ...trpc.adminFinancialMetrics.getPlatformMetrics.queryOptions(queryInput),
    enabled: isCustomRangeValid,
  });

  const metrics = data?.data?.metrics;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Platform Financial Metrics
          </h1>

          <p className="text-muted-foreground">
            Overview of platform revenue, transactions, sellers, and refunds.
          </p>
        </div>

        <div className="w-full lg:w-64">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRangePreset)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Inputs */}
      {dateRange === "custom" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Custom Date Range</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  From Date
                </label>

                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">To Date</label>

                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </div>

            {!isCustomRangeValid && (
              <p className="text-sm text-muted-foreground mt-3">
                Select both dates to view metrics.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Sellers"
          value={metrics?.activeSellerCount ?? 0}
          isLoading={isLoading}
        />

        <MetricCard
          title="Platform GMV"
          value={formatNaira(metrics?.totalGmvKobo ?? 0, {
            showDecimals: true,
          })}
          isLoading={isLoading}
        />

        <MetricCard
          title="Successful Transactions"
          value={metrics?.totalTransactionCount ?? 0}
          isLoading={isLoading}
        />

        <MetricCard
          title="Refund Count"
          value={metrics?.refunds.count ?? 0}
          isLoading={isLoading}
        />
      </div>

      {/* Refund Value */}
      <Card>
        <CardHeader>
          <CardTitle>Total Refund Value</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <p className="text-3xl font-bold">
              {formatNaira(metrics?.refunds.totalValueKobo ?? 0, {
                showDecimals: true,
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string | number;
  isLoading: boolean;
};

function MetricCard({ title, value, isLoading }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default withAdminAuth(AdminFinancialMetrics, {
  requiredPermissions: [PERMISSIONS.VIEW_FINANCIAL_ANALYTICS],
});

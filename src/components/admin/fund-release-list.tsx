"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  FundReleaseStatus,
  StoreTierEnum,
} from "@/lib/db/models/fund-release.model";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";

type SortaOptions = "newest" | "oldest" | "amount";

export default function AdminFundReleasesList() {
  const trpc = useTRPC();
  // --- State ----------------------------------------------------
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [status, setStatus] = useState<FundReleaseStatus | "all">("all");
  const [storeTier, setStoreTier] = useState<StoreTierEnum | "all">("all");
  const [riskLevel, setRiskLevel] = useState<"high" | "medium" | "low" | "all">(
    "all"
  );
  const [sort, setSort] = useState<SortaOptions>("newest");

  // --- TRPC Query ----------------------------------------------
  const {
    data,
    isLoading,
    refetch: triggerRefresh,
  } = useSuspenseQuery(
    trpc.adminFundRelease.getAll.queryOptions({
      sort,
      page,
      pageSize,
      status: status === "all" ? undefined : status,
      storeTier: storeTier === "all" ? undefined : storeTier,
      riskLevel: riskLevel === "all" ? undefined : riskLevel,
    })
  );

  // --- Filters --------------------------------------------------
  const handleStatusChange = useCallback(
    (value: string) => {
      setStatus(value as FundReleaseStatus | "all");
      setPage(1);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  const handleStoreTierChange = useCallback(
    (value: string) => {
      setStoreTier(value as StoreTierEnum | "all");
      setPage(1);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  const handleRiskLevelChange = useCallback(
    (value: string) => {
      setRiskLevel(value as "high" | "medium" | "low" | "all");
      setPage(1);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  const handleSortChange = useCallback(
    (value: SortaOptions) => {
      setSort(value);
      setPage(1);
      triggerRefresh();
    },
    [triggerRefresh]
  );

  const handleClearFilters = () => {
    setStatus("all");
    setStoreTier("all");
    setRiskLevel("all");
    setSort("newest");
    setPage(1);
    triggerRefresh();
  };

  // --- Data -----------------------------------------------------
  const fundReleases = data?.data || [];
  const pagination = data?.pagination;

  const hasActiveFilters =
    status !== "all" || storeTier !== "all" || riskLevel !== "all";

  // --- UI -------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Sorting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Filter by Status
                </label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(FundReleaseStatus).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Store Tier */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Filter by Store Tier
                </label>
                <Select value={storeTier} onValueChange={handleStoreTierChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {Object.values(StoreTierEnum).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Risk */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Filter by Risk Level
                </label>
                <Select value={riskLevel} onValueChange={handleRiskLevelChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All risks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Sort By
                </label>
                <Select value={sort} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="amount">Highest Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fund Releases</CardTitle>
          <CardDescription>
            {pagination?.total
              ? `Showing ${fundReleases.length} of ${pagination.total}`
              : "No records"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : fundReleases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No fund releases found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Release ID</TableHead>
                    <TableHead>Store Tier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {fundReleases.map((release) => (
                    <TableRow key={release._id.toString()}>
                      <TableCell className="font-mono text-xs">
                        {release._id.toString().slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {release.releaseRules.storeTier
                          .charAt(0)
                          .toUpperCase() +
                          release.releaseRules.storeTier.slice(1).toLowerCase()}
                      </TableCell>
                      <TableCell>
                        {formatNaira(release.settlement.amount)}
                      </TableCell>
                      <TableCell>
                        {release.status.charAt(0).toUpperCase() +
                          release.status.slice(1).toLowerCase()}
                      </TableCell>

                      <TableCell>
                        {release.riskIndicators?.isHighRiskStore ? (
                          <div className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">High</span>
                          </div>
                        ) : release.riskIndicators?.flags?.length ? (
                          <span className="text-xs text-yellow-600">
                            Medium
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Low
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {release.scheduledReleaseTime
                          ? new Date(
                              release.scheduledReleaseTime
                            ).toLocaleDateString()
                          : "—"}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/admin/fund-release/${release._id}`}
                          className="text-xs font-medium text-green-600 hover:text-green-700"
                        >
                          View <ChevronRight className="inline h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage(Math.min(pagination.totalPages, page + 1))
                  }
                  disabled={page === pagination.totalPages}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

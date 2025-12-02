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
  IFundRelease,
} from "@/lib/db/models/fund-release.model";
import { ChevronLeft, ChevronRight, ChevronRightCircle } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";

interface FundReleasesListProps {
  params: { store_id: string };
}

type SortOption = "newest" | "oldest" | "amount";

export default function FundReleasesList({ params }: FundReleasesListProps) {
  const { store_id } = params;
  const trpc = useTRPC();

  // Local UI state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<FundReleaseStatus | "all">("all");
  const [sort, setSort] = useState<SortOption>("newest");

  /**
   * Fetch fund releases (TRPC)
   */

  const { data, isLoading, refetch, error } = useSuspenseQuery(
    trpc.storeFundRelease.getStoreFundReleases.queryOptions({
      sort,
      page,
      pageSize,
      status: status === "all" ? undefined : status,
    })
  );

  const fundReleases = data?.data ?? [];
  const pagination = data?.pagination;

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value as FundReleaseStatus | "all");
    setPage(1);
  }, []);

  const handleSortChange = useCallback((value: SortOption) => {
    setSort(value);
    setPage(1);
  }, []);

  if (error) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Error loading fund releases. Try again.
          </p>
          <Button onClick={() => refetch()} variant="outline" className="mt-3">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters + Sorting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Sorting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">
                Filter by Status
              </label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.values(FundReleaseStatus)
                    .filter(
                      (s) =>
                        ![
                          FundReleaseStatus.Processing,
                          FundReleaseStatus.Released,
                        ].includes(s)
                    )
                    .map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Sort By</label>
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount">Amount (High → Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {(status !== "all" || sort !== "newest") && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("all");
                  setSort("newest");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
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
            <LoadingRows />
          ) : fundReleases.length === 0 ? (
            <EmptyState />
          ) : (
            <FundReleaseTable releases={fundReleases} store_id={store_id} />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <PaginationControls
          pagination={pagination}
          page={page}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Helper UI Components
---------------------------------------------------------- */

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-muted-foreground">No fund releases found</p>
    </div>
  );
}

function FundReleaseTable({
  releases,
  store_id,
}: {
  releases: IFundRelease[];
  store_id: string;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Release ID</TableHead>
            <TableHead>Order ID</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Released</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {releases.map((release) => (
            <TableRow key={release._id.toString()}>
              <TableCell className="font-mono text-xs">
                {release._id.toString().slice(0, 8)}...
              </TableCell>

              <TableCell className="font-mono text-xs">
                {release.orderId.toString().slice(0, 8)}...
              </TableCell>

              <TableCell className="font-semibold">
                {formatNaira(release.settlement.amount)}
              </TableCell>

              <TableCell>
                <StatusBadge status={release.status} />
              </TableCell>

              <TableCell>
                {release.scheduledReleaseTime
                  ? new Date(release.scheduledReleaseTime).toLocaleDateString()
                  : "—"}
              </TableCell>

              <TableCell>
                {release.actualReleasedAt
                  ? new Date(release.actualReleasedAt).toLocaleDateString()
                  : "—"}
              </TableCell>

              <TableCell>
                <Link
                  href={`/store/${store_id}/escrow/${release._id}`}
                  className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700"
                >
                  View Details
                  <ChevronRightCircle className="h-3 w-3" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaginationControls({
  pagination,
  page,
  isLoading,
  onPageChange,
}: {
  pagination: any;
  page: number;
  isLoading: boolean;
  onPageChange: (n: number) => void;
}) {
  return (
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
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onPageChange(Math.min(pagination.totalPages, page + 1))
              }
              disabled={page === pagination.totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: FundReleaseStatus }) {
  const colors = {
    [FundReleaseStatus.Pending]: "bg-yellow-100 text-yellow-800",
    [FundReleaseStatus.Ready]: "bg-blue-100 text-blue-800",
    [FundReleaseStatus.Processing]: "bg-purple-100 text-purple-800",
    [FundReleaseStatus.Released]: "bg-green-100 text-green-800",
    [FundReleaseStatus.Failed]: "bg-red-100 text-red-800",
    [FundReleaseStatus.Reversed]: "bg-orange-100 text-orange-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

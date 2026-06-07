"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Clock,
  Eye,
  Filter,
  LockKeyhole,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/lib/utils/naira";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { DisputeStatus, DisputeOutcome } from "@/enums/financial.enums";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Urgency indicator — shown on OPEN and AWAITING_EVIDENCE disputes
// ---------------------------------------------------------------------------

function UrgencyIndicator({ daysRemaining }: { daysRemaining: number | null }) {
  if (daysRemaining === null) return null;

  if (daysRemaining === 0) {
    return (
      <div className="flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold">Due today</span>
      </div>
    );
  }

  if (daysRemaining === 1) {
    return (
      <div className="flex items-center gap-1 text-orange-500 dark:text-orange-400">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-semibold">1 day left</span>
      </div>
    );
  }

  if (daysRemaining <= 2) {
    return (
      <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-medium">{daysRemaining} days left</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span className="text-xs">{daysRemaining} days left</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function DisputeStatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    [DisputeStatus.OPEN]:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    [DisputeStatus.AWAITING_EVIDENCE]:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    [DisputeStatus.RESOLVED]:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    [DisputeStatus.AUTO_RESOLVED]:
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  const labels: Record<string, string> = {
    [DisputeStatus.OPEN]: "Open",
    [DisputeStatus.AWAITING_EVIDENCE]: "Awaiting Evidence",
    [DisputeStatus.RESOLVED]: "Resolved",
    [DisputeStatus.AUTO_RESOLVED]: "Auto-Resolved",
  };

  return (
    <Badge className={config[status] ?? "bg-gray-100 text-gray-800"}>
      {labels[status] ?? status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Outcome badge
// ---------------------------------------------------------------------------

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return <span className="text-xs text-muted-foreground">—</span>;

  const config: Record<string, string> = {
    [DisputeOutcome.UPHELD]:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    [DisputeOutcome.REJECTED]:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    [DisputeOutcome.INCONCLUSIVE]:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };

  const labels: Record<string, string> = {
    [DisputeOutcome.UPHELD]: "Upheld",
    [DisputeOutcome.REJECTED]: "Rejected",
    [DisputeOutcome.INCONCLUSIVE]: "Inconclusive",
  };

  return (
    <Badge className={config[outcome] ?? "bg-gray-100 text-gray-800"}>
      {labels[outcome] ?? outcome}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function DisputeMonitoring() {
  const trpc = useTRPC();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const { data, isLoading, refetch, error } = useQuery(
    trpc.adminDispute.listDisputes.queryOptions({
      page,
      limit,
      status: statusFilter as any,
    }),
  );

  const disputes = data?.disputes ?? [];
  const totalDisputes = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.pages ?? 1;

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setPage(1);
    setTimeout(() => refetch(), 0);
  };

  // Count open + awaiting evidence for the header summary
  const activeCount = disputes.filter(
    (d) =>
      d.status === DisputeStatus.OPEN ||
      d.status === DisputeStatus.AWAITING_EVIDENCE,
  ).length;

  if (error) {
    return <div className="text-destructive">{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Dispute Management
          </h1>
          <p className="text-muted-foreground">
            Review and resolve customer disputes
          </p>
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <LockKeyhole className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {activeCount} active dispute{activeCount !== 1 ? "s" : ""} on this
              page
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="w-5 h-5 mr-2 text-soraxi-green" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="border border-input rounded-md px-3 py-2 text-sm bg-background min-w-[180px]"
              >
                <option value="all">All Disputes</option>
                <option value={DisputeStatus.OPEN}>Open</option>
                <option value={DisputeStatus.AWAITING_EVIDENCE}>
                  Awaiting Evidence
                </option>
                <option value={DisputeStatus.RESOLVED}>Resolved</option>
                <option value={DisputeStatus.AUTO_RESOLVED}>
                  Auto-Resolved
                </option>
              </select>
            </div>
            <Button variant="outline" onClick={handleResetFilters}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Disputes ({totalDisputes})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-soraxi-green" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No disputes found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispute ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Frozen Amount</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow
                    key={dispute.disputeId}
                    className={
                      dispute.businessDaysRemaining !== null &&
                      dispute.businessDaysRemaining <= 1
                        ? "bg-red-50/50 dark:bg-red-950/10"
                        : dispute.businessDaysRemaining !== null &&
                            dispute.businessDaysRemaining <= 2
                          ? "bg-amber-50/50 dark:bg-amber-950/10"
                          : ""
                    }
                  >
                    <TableCell className="font-mono text-xs">
                      #{dispute.disputeId.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <DisputeStatusBadge status={dispute.status} />
                    </TableCell>
                    <TableCell>
                      <OutcomeBadge outcome={dispute.outcome} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatNaira(dispute.frozenAmount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(dispute.openedAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(dispute.deadline), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <UrgencyIndicator
                        daysRemaining={dispute.businessDaysRemaining}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <Link href={`/admin/disputes/${dispute.disputeId}`}>
                            <DropdownMenuItem className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" />
                              {dispute.status === DisputeStatus.OPEN ||
                              dispute.status === DisputeStatus.AWAITING_EVIDENCE
                                ? "Review & Resolve"
                                : "View Details"}
                            </DropdownMenuItem>
                          </Link>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1}–
                {Math.min(page * limit, totalDisputes)} of {totalDisputes}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }).map(
                    (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2)
                        pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;

                      if (pageNum > 0 && pageNum <= totalPages) {
                        return (
                          <Button
                            key={i}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            className={
                              pageNum === page
                                ? "bg-soraxi-green hover:bg-soraxi-green/90"
                                : ""
                            }
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    },
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withAdminAuth(DisputeMonitoring, {
  requiredPermissions: [PERMISSIONS.RESOLVE_DISPUTES],
});

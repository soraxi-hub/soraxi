"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ClipboardList, Eye, Users } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";
import { format } from "date-fns";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "invited";

/**
 * Admin Waitlist Applications List
 *
 * Displays all vendor waitlist applications with status filtering and
 * category saturation counts. Read-only list — actions are on the detail page.
 */
function AdminWaitlistList() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const limit = 20;

  const { data, isLoading } = useQuery(
    trpc.waitlist.getPendingApplications.queryOptions({
      page,
      limit,
    }),
  );

  const applications = data?.applications ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.pages ?? 1;

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Approved
          </Badge>
        );
      case "invited":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            Invited
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategorySaturationColor = (count: number) => {
    if (count >= 20) return "text-red-600 font-semibold";
    if (count >= 10) return "text-amber-600 font-semibold";
    return "text-green-600 font-semibold";
  };

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Vendor Applications
          </h1>
          <p className="text-muted-foreground">
            Review and manage vendor waitlist applications
          </p>
        </div>
      </div>

      {/* ── Summary row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            {
              label: "Pending Review",
              key: "pending",
              color: "text-amber-600",
            },
            { label: "Approved", key: "approved", color: "text-blue-600" },
            { label: "Invited", key: "invited", color: "text-green-600" },
            { label: "Rejected", key: "rejected", color: "text-red-600" },
          ] as const
        ).map((item) => (
          <div
            key={item.key}
            className="rounded-xl border bg-card p-4 space-y-1"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color}`}>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : // summary counts not yet on this endpoint — show total for pending
              item.key === statusFilter ? (
                total
              ) : (
                "—"
              )}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">Filters</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1 w-52">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground pb-0.5">
            {total} application{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Applications table ─────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-soraxi-green" />
          <span className="font-semibold text-foreground">Applications</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date Applied</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">
                <span className="flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  Vendors in Category
                </span>
              </TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground font-medium">
                      No applications found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {statusFilter === "pending"
                        ? "No pending applications to review"
                        : `No ${statusFilter} applications`}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(app.createdAt), "MMM dd, yyyy")}
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{app.businessName}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.email}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{app.categoryId}</p>
                      {app.subCategory && (
                        <p className="text-xs text-muted-foreground">
                          {app.subCategory}
                        </p>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <span
                      className={getCategorySaturationColor(
                        app.categoryVendorCount,
                      )}
                    >
                      {app.categoryVendorCount}
                    </span>
                  </TableCell>

                  <TableCell>
                    {app.isDropshipper ? "Dropshipper" : "Holds stock"}
                  </TableCell>

                  <TableCell>{getStatusBadge(app.status)}</TableCell>

                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/waitlist/${app.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}{" "}
              of {total} applications
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default withAdminAuth(AdminWaitlistList, {
  requiredPermissions: [PERMISSIONS.VIEW_WAITLIST],
});

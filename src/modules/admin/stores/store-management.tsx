"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Store,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Search,
  Filter,
  MoreVerticalIcon,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { IStore } from "@/lib/db/models/store.model";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

type Status = IStore["status"];
type VerificationFilter = "all" | "true" | "false";

/**
 * Store Management Component
 * Comprehensive store administration interface
 */
export function StoreManagement() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");

  // Use useQuery directly in component body
  const {
    data,
    isLoading,
    refetch: refetchStore,
  } = useQuery(
    trpc.adminStore.listStores.queryOptions({
      search: searchQuery,
      status: statusFilter,
      verified: verificationFilter,
      limit,
      page,
    })
  );

  const stores = data?.stores || [];
  const loading = isLoading;
  const total = data?.pagination.total || 0;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, verificationFilter, searchQuery, limit]);

  const storeAction = useMutation(
    trpc.adminStore.storeActionForAdmins.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        refetchStore();
      },
      onError: (err) => {
        toast.error(err.message || "Action failed");
      },
    })
  );

  const handleStoreAction = async (
    storeId: string,
    action: "approved" | "rejected" | "reactivate" | "suspend"
  ) => {
    storeAction.mutate({ storeId, action });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      suspended: "bg-red-100 text-red-800",
      rejected: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.storeEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Store Management
          </h1>
          <p className="text-muted-foreground">
            Manage and moderate platform stores
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search stores..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(e: Status | "all") => setStatusFilter(e)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Verification</Label>
              <Select
                value={verificationFilter}
                onValueChange={(e: VerificationFilter) =>
                  setVerificationFilter(e)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Verified</SelectItem>
                  <SelectItem value="false">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => refetchStore()}
                className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stores Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stores ({filteredStores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Business Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading stores...
                  </TableCell>
                </TableRow>
              ) : filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No stores found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-soraxi-green/10 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-soraxi-green" />
                        </div>
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {store.storeEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(store.status)}</TableCell>
                    <TableCell>
                      {store.verification ? (
                        store.verification.isVerified ? (
                          <Badge className="bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unverified</Badge>
                        )
                      ) : (
                        <Badge>
                          Hasn&#39;t completed the onboarding Process
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {store.businessInfo ? (
                        <Badge variant="outline">
                          {store.businessInfo.type === "company"
                            ? "Company"
                            : "Individual"}
                        </Badge>
                      ) : (
                        <Badge>
                          Hasn&#39;t completed the onboarding Process
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(store.createdAt).toLocaleDateString()}</p>
                        <p className="text-muted-foreground">
                          Last:{" "}
                          {new Date(store.lastActivity).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/stores/${store.id}`}>
                              <MoreVerticalIcon className="w-4 h-4 mr-2" />
                              View More
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {store.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStoreAction(store.id, "approved")
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStoreAction(store.id, "rejected")
                                }
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {store.status === "active" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStoreAction(store.id, "suspend")
                              }
                              className="text-red-600"
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {store.status === "suspended" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStoreAction(store.id, "reactivate")
                              }
                              className="text-green-600"
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!isLoading && stores.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} stores
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page * limit >= total}
                  onClick={() => setPage(page + 1)}
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

export default withAdminAuth(StoreManagement, {
  requiredPermissions: [PERMISSIONS.VIEW_STORES],
});

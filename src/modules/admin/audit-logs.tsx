"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Filter, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type OutputAdmin = inferProcedureOutput<
  AppRouter["adminManagement"]["listAdmins"]
>;
type OutputLogs = inferProcedureOutput<
  AppRouter["adminAuditLog"]["getAuditLogs"]
>;

type Admin = OutputAdmin["admins"][number];
type AuditLog = OutputLogs["auditLogs"][number];
type Pagination = OutputLogs["pagination"];

// Component Start
function AuditTrailPage() {
  const trpc = useTRPC();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logId, setLogId] = useState<string>("");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    totalLogs: 0,
    totalPages: 0,
  });

  // Filter states
  const [filters, setFilters] = useState({
    adminId: "",
    action: "",
    myModule: "",
    resourceId: "",
    resourceType: "",
    startDate: "",
    endDate: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Lists for dropdowns
  const [myModules, setMyModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);

  const { data, isLoading: loadingAdmin } = useQuery(
    trpc.adminManagement.listAdmins.queryOptions()
  );

  const { data: logDetails, refetch: refetchLogDetails } = useQuery(
    trpc.adminAuditLog.getAuditLogDetail.queryOptions(
      { id: logId },
      {
        enabled: !!logId,
      }
    )
  );

  useEffect(() => {
    if (logDetails) {
      setSelectedLog(logDetails.auditLog);
      setIsDetailOpen(true);
    }
  }, [logDetails]);

  const {
    data: logs,
    isLoading: loadingLogs,
    refetch: fetchAuditLogs,
  } = useQuery(
    trpc.adminAuditLog.getAuditLogs.queryOptions({
      page: pagination.page,
      limit: pagination.limit,
      adminId: filters.adminId,
      action: filters.action,
      myModule: filters.myModule,
      resourceId: filters.resourceId,
      resourceType: filters.resourceType,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
  );

  useEffect(() => {
    if (data) {
      setAdmins(
        data.admins.map((admin: Admin) => ({ id: admin._id, name: admin.name }))
      );

      // These would typically come from an API, but for simplicity we'll hardcode some common values
      setMyModules([
        "ADMIN_MANAGEMENT",
        "AUTHENTICATION",
        "PRODUCT_MANAGEMENT",
        "ORDER_MANAGEMENT",
        "STORE_MANAGEMENT",
        "CUSTOMER_SUPPORT",
        "AUDIT",
      ]);

      setActions([
        "CREATE_ADMIN",
        "UPDATE_ADMIN",
        "DELETE_ADMIN",
        "ADMIN_LOGIN",
        "VIEW_ADMINS",
        "VIEW_AUDIT_LOGS",
        "VIEW_AUDIT_LOG_DETAIL",
        "CREATE_PRODUCT",
        "UPDATE_PRODUCT",
        "DELETE_PRODUCT",
        "VERIFY_PRODUCT",
        "UPDATE_ORDER",
        "CANCEL_ORDER",
        "VERIFY_STORE",
      ]);
    }
  }, [data]);

  useEffect(() => {
    if (logs) {
      setAuditLogs(logs.auditLogs);
      setPagination(logs.pagination);
    }
  }, [logs]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
    fetchAuditLogs();
  };

  const resetFilters = () => {
    setFilters({
      adminId: "",
      action: "",
      myModule: "",
      resourceId: "",
      resourceType: "",
      startDate: "",
      endDate: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAuditLogs();
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy h:mm a");
    } catch (e) {
      return dateString;
    }
  };

  const getActionColor = (action: string) => {
    if (action.startsWith("CREATE")) return "bg-green-100 text-green-800";
    if (action.startsWith("UPDATE")) return "bg-blue-100 text-blue-800";
    if (action.startsWith("DELETE")) return "bg-red-100 text-red-800";
    if (action.startsWith("VIEW")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  const loading = loadingAdmin || loadingLogs;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Audit Trail</h1>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Filters</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin">Admin</Label>
                <Select
                  value={filters.adminId}
                  onValueChange={(value) =>
                    handleFilterChange("adminId", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Admin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Admins</SelectItem>
                    {admins.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action">Action</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => handleFilterChange("action", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="myModule">Module</Label>
                <Select
                  value={filters.myModule}
                  onValueChange={(value) =>
                    handleFilterChange("myModule", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {myModules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resourceId">Resource ID</Label>
                <Input
                  id="resourceId"
                  value={filters.resourceId}
                  onChange={(e) =>
                    handleFilterChange("resourceId", e.target.value)
                  }
                  placeholder="Enter Resource ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resourceType">Resource Type</Label>
                <Input
                  id="resourceType"
                  value={filters.resourceType}
                  onChange={(e) =>
                    handleFilterChange("resourceType", e.target.value)
                  }
                  placeholder="Enter Resource Type"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    handleFilterChange("startDate", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    handleFilterChange("endDate", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button onClick={applyFilters}>Apply Filters</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-4"
                    >
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>{formatDate(log.createdAt)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.adminName}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.adminEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.myModule.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        {log.resourceType && log.resourceId ? (
                          <div>
                            <div className="text-xs font-medium">
                              {log.resourceType}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {log.resourceId}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{log.ipAddress || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLogId(log._id);
                            refetchLogDetails();
                            toast("Loading log details...");
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.totalLogs
                )}{" "}
                of {pagination.totalLogs} logs
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 py-1 border rounded">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Date & Time
                  </h3>
                  <p>{formatDate(selectedLog.createdAt)}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Action</h3>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Admin</h3>
                  <p>{selectedLog.adminName}</p>
                  <p className="text-sm text-gray-500">
                    {selectedLog.adminEmail}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Admin Roles
                  </h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLog.adminRoles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Module</h3>
                  <p>{selectedLog.myModule.replace(/_/g, " ")}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    IP Address
                  </h3>
                  <p>{selectedLog.ipAddress || "-"}</p>
                </div>

                {selectedLog.resourceType && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Resource Type
                    </h3>
                    <p>{selectedLog.resourceType}</p>
                  </div>
                )}

                {selectedLog.resourceId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">
                      Resource ID
                    </h3>
                    <p className="break-all">{selectedLog.resourceId}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    User Agent
                  </h3>
                  <p className="text-xs break-all">
                    {selectedLog.userAgent || "-"}
                  </p>
                </div>
              </div>

              {selectedLog.details &&
                Object.keys(selectedLog.details).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      Details
                    </h3>
                    <pre className="bg-gray-50 dark:bg-black/50 p-4 rounded-md overflow-auto max-h-80 text-xs">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAdminAuth(AuditTrailPage, {
  requiredPermissions: [PERMISSIONS.MANAGE_ADMINS],
});

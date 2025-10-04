"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

function DeliveryConfirmationQueue() {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const {
    data,
    isLoading: loading,
    refetch: loadData,
  } = useQuery(
    trpc.adminDeliveryConfirmation.getConfirmationQueue.queryOptions({
      search,
      limit,
      page,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
    })
  );

  const confirmDelivery = useMutation(
    trpc.adminDeliveryConfirmation.autoConfirmDelivery.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        loadData();
      },
      onError: (data) => {
        toast.error(data ? data.message : "An unexpected error occurred");
      },
    })
  );

  const items = data?.deliveryConfirmations || [];
  const total = data?.pagination.total || 0;

  const handleManualConfirm = async (subOrderId: string) => {
    confirmDelivery.mutate({ subOrderId });
  };

  const applyFilters = () => {
    setPage(1);
    loadData();
  };

  const resetFilters = () => {
    setSearch("");
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
    setTimeout(loadData, 0);
  };

  useEffect(() => {
    loadData();
  }, [page, limit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <AlertTriangle className="w-8 h-8 mr-3 text-soraxi-green" />
            Delivery Confirmation Audit
          </h1>
          <p className="text-muted-foreground">
            Manage deliveries requiring manual confirmation
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2 text-soraxi-green" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
                <Input
                  placeholder="Name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Delivery Date Range</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Calendar className="mr-2 h-4 w-4" />
                      {fromDate ? format(fromDate, "PPP") : "From Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={fromDate}
                      onSelect={setFromDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Calendar className="mr-2 h-4 w-4" />
                      {toDate ? format(toDate, "PPP") : "To Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={toDate}
                      onSelect={setToDate}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Apply Changes</Label>
              <Button
                onClick={applyFilters}
                className="flex-1 bg-soraxi-green hover:bg-soraxi-green/90"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply
              </Button>
              <Button
                onClick={resetFilters}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2 text-soraxi-green" />
            Pending Confirmations ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub-Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Escrow Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No pending delivery confirmations found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.subOrderId}>
                    <TableCell>
                      <div className="font-medium">
                        {item.subOrderId.substring(0, 8)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Order: {item.orderNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.customer.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.customer.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.store.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.store.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.deliveryDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {item.escrow.held ? (
                        <Badge variant="destructive">Held</Badge>
                      ) : (
                        <Badge className="bg-soraxi-green text-white">
                          Released
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleManualConfirm(item.subOrderId)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {!loading && items.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} items
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

export default withAdminAuth(DeliveryConfirmationQueue, {
  requiredPermissions: [PERMISSIONS.STALE_ORDERS],
});

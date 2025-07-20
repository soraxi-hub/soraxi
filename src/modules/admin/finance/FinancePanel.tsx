"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Store,
  CreditCard,
  Download,
  Send,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

/**
 * Finance Panel Component
 * Comprehensive financial management interface for admins
 */

interface PayoutData {
  id: string;
  store: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  processedAt?: string;
  transactionId?: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
  notes?: string;
}

interface FinancialStats {
  totalRevenue: number;
  totalPayouts: number;
  pendingPayouts: number;
  platformFees: number;
  activeStores: number;
  totalTransactions: number;
  revenueGrowth: number;
  payoutGrowth: number;
}

export function FinancePanel() {
  const [payouts, setPayouts] = useState<PayoutData[]>([]);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<PayoutData | null>(null);
  const [showPayoutDetails, setShowPayoutDetails] = useState(false);
  const [showProcessPayout, setShowProcessPayout] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [dateRange, setDateRange] = useState<string>("30");

  useEffect(() => {
    loadFinanceData();
  }, [statusFilter, dateRange]);

  const loadFinanceData = async () => {
    try {
      setLoading(true);

      // Load payouts
      const payoutParams = new URLSearchParams();
      if (statusFilter !== "all") payoutParams.append("status", statusFilter);
      payoutParams.append("days", dateRange);

      const [payoutsResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/finance/payouts?${payoutParams}`),
        fetch(`/api/admin/finance/stats?days=${dateRange}`),
      ]);

      const [payoutsData, statsData] = await Promise.all([
        payoutsResponse.json(),
        statsResponse.json(),
      ]);

      if (payoutsResponse.ok) {
        setPayouts(payoutsData.payouts);
      }

      if (statsResponse.ok) {
        setStats(statsData.stats);
      }
    } catch (error) {
      toast.error("Failed to load finance data");
      console.log("Failed to load finance data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId: string, action: string) => {
    try {
      const response = await fetch(
        `/api/admin/finance/payouts/${payoutId}/process`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        loadFinanceData();
        setShowProcessPayout(false);
        setSelectedPayout(null);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process payout"
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    };

    const icons = {
      pending: Clock,
      processing: Send,
      completed: CheckCircle,
      failed: AlertCircle,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Finance Panel</h1>
          <p className="text-muted-foreground">
            Manage payouts and financial operations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Financial Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {stats.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                {Math.abs(stats.revenueGrowth)}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Payouts
              </CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalPayouts)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {stats.payoutGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1 text-red-500" />
                )}
                {Math.abs(stats.payoutGrowth)}% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payouts
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.pendingPayouts)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Platform Fees
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.platformFees)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {stats.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadFinanceData} className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payouts ({payouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Bank Details</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading payouts...
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No payouts found
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-soraxi-green/10 rounded-lg flex items-center justify-center">
                          <Store className="w-5 h-5 text-soraxi-green" />
                        </div>
                        <div>
                          <p className="font-medium">{payout.store.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.store.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="w-3 h-3" />
                        <span className="font-medium">
                          {payout.amount.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          {new Date(payout.requestedAt).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(payout.requestedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">
                          {payout.bankDetails.bankName}
                        </p>
                        <p className="text-muted-foreground">
                          ****{payout.bankDetails.accountNumber.slice(-4)}
                        </p>
                        <p className="text-muted-foreground">
                          {payout.bankDetails.accountHolderName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowPayoutDetails(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {payout.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPayout(payout);
                              setShowProcessPayout(true);
                            }}
                            className="bg-soraxi-green hover:bg-soraxi-green/90"
                          >
                            Process
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payout Details Dialog */}
      <Dialog open={showPayoutDetails} onOpenChange={setShowPayoutDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              Complete information for payout request
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Store</Label>
                  <p className="text-sm">{selectedPayout.store.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm font-medium">
                    {formatCurrency(selectedPayout.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedPayout.status)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Requested At</Label>
                  <p className="text-sm">
                    {new Date(selectedPayout.requestedAt).toLocaleString()}
                  </p>
                </div>
                {selectedPayout.processedAt && (
                  <div>
                    <Label className="text-sm font-medium">Processed At</Label>
                    <p className="text-sm">
                      {new Date(selectedPayout.processedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedPayout.transactionId && (
                  <div>
                    <Label className="text-sm font-medium">
                      Transaction ID
                    </Label>
                    <p className="text-sm font-mono">
                      {selectedPayout.transactionId}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Bank Details</Label>
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Bank:</strong> {selectedPayout.bankDetails.bankName}
                  </p>
                  <p className="text-sm">
                    <strong>Account:</strong>{" "}
                    {selectedPayout.bankDetails.accountNumber}
                  </p>
                  <p className="text-sm">
                    <strong>Holder:</strong>{" "}
                    {selectedPayout.bankDetails.accountHolderName}
                  </p>
                </div>
              </div>

              {selectedPayout.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm mt-1">{selectedPayout.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Process Payout Dialog */}
      <Dialog open={showProcessPayout} onOpenChange={setShowProcessPayout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Confirm processing payout of{" "}
              {selectedPayout && formatCurrency(selectedPayout.amount)} to{" "}
              {selectedPayout?.store.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPayout && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong>Store:</strong> {selectedPayout.store.name}
                  </div>
                  <div>
                    <strong>Amount:</strong>{" "}
                    {formatCurrency(selectedPayout.amount)}
                  </div>
                  <div>
                    <strong>Bank:</strong> {selectedPayout.bankDetails.bankName}
                  </div>
                  <div>
                    <strong>Account:</strong> ****
                    {selectedPayout.bankDetails.accountNumber.slice(-4)}
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This action will initiate a bank
                  transfer. Make sure all details are correct before proceeding.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProcessPayout(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedPayout &&
                handleProcessPayout(selectedPayout.id, "approve")
              }
              className="bg-soraxi-green hover:bg-soraxi-green/90"
            >
              Process Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

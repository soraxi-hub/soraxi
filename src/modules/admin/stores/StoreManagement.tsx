"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Eye,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  MessageSquare,
  DollarSign,
  Package,
  ShoppingCart,
  Search,
  Filter,
} from "lucide-react";

/**
 * Store Management Component
 * Comprehensive store administration interface
 */

interface StoreData {
  id: string;
  name: string;
  storeEmail: string;
  status: "active" | "pending" | "suspended" | "rejected";
  verification: {
    isVerified: boolean;
    method: string;
    notes?: string;
  };
  businessInfo: {
    type: "individual" | "company";
    businessName?: string;
    registrationNumber?: string;
  };
  stats: {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    averageRating: number;
  };
  createdAt: string;
  lastActivity: string;
  notes: Array<{
    id: string;
    adminName: string;
    content: string;
    createdAt: string;
  }>;
}

export function StoreManagement() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null);
  const [showStoreDetails, setShowStoreDetails] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");

  useEffect(() => {
    loadStores();
  }, [statusFilter, verificationFilter]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (verificationFilter !== "all")
        params.append("verified", verificationFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/admin/stores?${params}`);
      const data = await response.json();

      if (response.ok) {
        setStores(data.stores);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to load stores");
    } finally {
      setLoading(false);
    }
  };

  const handleStoreAction = async (
    storeId: string,
    action: string,
    reason?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/stores/${storeId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        loadStores();
        setSelectedStore(null);
        setShowStoreDetails(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const handleAddNote = async () => {
    if (!selectedStore || !newNote.trim()) return;

    try {
      const response = await fetch(
        `/api/admin/stores/${selectedStore.id}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNote }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Note added successfully");
        setNewNote("");
        setShowAddNote(false);
        // Refresh store details
        loadStores();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      pending: "secondary",
      suspended: "destructive",
      rejected: "destructive",
    } as const;

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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                onValueChange={setVerificationFilter}
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
              <Button onClick={loadStores} className="w-full">
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
                <TableHead>Stats</TableHead>
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
                      {store.verification.isVerified ? (
                        <Badge className="bg-green-100 text-green-800">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {store.businessInfo.type === "company"
                          ? "Company"
                          : "Individual"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center space-x-1">
                          <Package className="w-3 h-3" />
                          <span>{store.stats.totalProducts} products</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{store.stats.totalOrders} orders</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>
                            ${store.stats.totalRevenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStore(store);
                              setShowStoreDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {store.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStoreAction(store.id, "approve")
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStoreAction(store.id, "reject")
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStore(store);
                              setShowAddNote(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Add Note
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Store Details Dialog */}
      <Dialog open={showStoreDetails} onOpenChange={setShowStoreDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Store Details</DialogTitle>
            <DialogDescription>
              Comprehensive information about {selectedStore?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedStore && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Store Name</Label>
                      <p className="text-sm">{selectedStore.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm">{selectedStore.storeEmail}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1">
                        {getStatusBadge(selectedStore.status)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">
                        Business Type
                      </Label>
                      <p className="text-sm">
                        {selectedStore.businessInfo.type}
                      </p>
                    </div>
                    {selectedStore.businessInfo.businessName && (
                      <div>
                        <Label className="text-sm font-medium">
                          Business Name
                        </Label>
                        <p className="text-sm">
                          {selectedStore.businessInfo.businessName}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Products</span>
                      <span className="font-medium">
                        {selectedStore.stats.totalProducts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Orders</span>
                      <span className="font-medium">
                        {selectedStore.stats.totalOrders}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Revenue</span>
                      <span className="font-medium">
                        ${selectedStore.stats.totalRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Rating</span>
                      <span className="font-medium">
                        {selectedStore.stats.averageRating}/5
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedStore.notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No notes added yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStore.notes.map((note) => (
                        <div
                          key={note.id}
                          className="border border-border rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {note.adminName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Note</DialogTitle>
            <DialogDescription>
              Add a note about {selectedStore?.name} for other admins
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Enter your note here..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

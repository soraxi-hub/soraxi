"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Package, Search, Filter, Eye, Clock, CheckCircle, XCircle, Truck, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface ReturnRequest {
  _id: string
  orderId: string
  subOrderId: string
  userId: {
    _id: string
    firstName: string
    lastName: string
    email: string
  }
  productId: {
    _id: string
    name: string
    images: string[]
    price: number
  }
  quantity: number
  reason: string
  status: "Requested" | "Approved" | "Rejected" | "In-Transit" | "Received" | "Refunded"
  requestedAt: string
  refundAmount: number
  images?: string[]
}

interface StoreReturnsManagementProps {
  storeId: string
}

const statusColors = {
  Requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Approved: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
  "In-Transit": "bg-blue-100 text-blue-800 border-blue-200",
  Received: "bg-purple-100 text-purple-800 border-purple-200",
  Refunded: "bg-emerald-100 text-emerald-800 border-emerald-200",
}

const statusIcons = {
  Requested: Clock,
  Approved: CheckCircle,
  Rejected: XCircle,
  "In-Transit": Truck,
  Received: Package,
  Refunded: CheckCircle,
}

export function StoreReturnsManagement({ storeId }: StoreReturnsManagementProps) {
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
  })

  const fetchReturns = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/store/returns?storeId=${storeId}&status=${statusFilter}&search=${searchTerm}`)

      if (!response.ok) {
        throw new Error("Failed to fetch returns")
      }

      const data = await response.json()
      setReturns(data.returns)
      setStats(data.stats)
    } catch (error) {
      console.error("Error fetching returns:", error)
      toast.error("Failed to load returns")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReturns()
  }, [storeId, statusFilter])

  const handleSearch = () => {
    fetchReturns()
  }

  const filteredReturns = returns.filter((returnItem) => {
    const matchesSearch =
      searchTerm === "" ||
      returnItem.productId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.userId.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.orderId.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Returns</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Returns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by product, customer, or order ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Requested">Requested</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="In-Transit">In-Transit</SelectItem>
                <SelectItem value="Received">Received</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} className="w-full sm:w-auto">
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Return Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReturns.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No return requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((returnItem) => {
                    const StatusIcon = statusIcons[returnItem.status]
                    return (
                      <TableRow key={returnItem._id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {returnItem.userId.firstName[0]}
                                {returnItem.userId.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {returnItem.userId.firstName} {returnItem.userId.lastName}
                              </p>
                              <p className="text-sm text-gray-500">{returnItem.userId.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <img
                              src={returnItem.productId.images[0] || "/placeholder.svg"}
                              alt={returnItem.productId.name}
                              className="h-10 w-10 rounded object-cover"
                            />
                            <div>
                              <p className="font-medium">{returnItem.productId.name}</p>
                              <p className="text-sm text-gray-500">
                                ₦{(returnItem.productId.price / 100).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{returnItem.reason}</p>
                        </TableCell>
                        <TableCell>{returnItem.quantity}</TableCell>
                        <TableCell>₦{(returnItem.refundAmount / 100).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[returnItem.status]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {returnItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">
                            {formatDistanceToNow(new Date(returnItem.requestedAt), { addSuffix: true })}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Link href={`/store/${storeId}/returns/${returnItem._id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

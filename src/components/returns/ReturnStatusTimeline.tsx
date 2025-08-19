"use client"

import { Clock, CheckCircle, XCircle, Truck, Package, RefreshCw, AlertCircle } from "lucide-react"

interface StatusHistoryItem {
  status: string
  timestamp: string
  notes?: string
}

interface ReturnStatusTimelineProps {
  statusHistory: StatusHistoryItem[]
}

export function ReturnStatusTimeline({ statusHistory }: ReturnStatusTimelineProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Requested":
      case "Return Requested":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "In-Transit":
        return <Truck className="h-4 w-4 text-blue-500" />
      case "Received":
        return <Package className="h-4 w-4 text-purple-500" />
      case "Refunded":
        return <RefreshCw className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return (
    <div className="space-y-4">
      {sortedHistory.map((history, index) => (
        <div key={index} className="flex items-start space-x-3 pb-4 border-b last:border-b-0">
          <div className="flex-shrink-0 mt-1">{getStatusIcon(history.status)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{history.status}</p>
              <p className="text-xs text-muted-foreground">{formatDate(history.timestamp)}</p>
            </div>
            {history.notes && <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

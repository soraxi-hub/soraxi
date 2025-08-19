"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Clock, CheckCircle } from "lucide-react";
import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  images: string[];
  price: number;
}

interface OrderProduct {
  Product: Product;
  quantity: number;
  price: number;
  selectedSize?: {
    size: string;
    price: number;
  };
}

interface ReturnItem {
  _id: string;
  userId: string;
  productId: string;
  quantity: number;
  reason: string;
  status:
    | "Requested"
    | "Approved"
    | "Rejected"
    | "In-Transit"
    | "Received"
    | "Refunded";
  requestedAt: string;
  approvedAt?: string;
  refundAmount: number;
  returnShippingCost?: number;
}

interface ProductReturnCardProps {
  product: OrderProduct;
  existingReturn?: ReturnItem;
  canReturn: boolean;
  onRequestReturn: (product: OrderProduct) => void;
}

export function ProductReturnCard({
  product,
  existingReturn,
  canReturn,
  onRequestReturn,
}: ProductReturnCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getReturnStatusBadge = (status: string) => {
    const statusConfig = {
      Requested: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      Approved: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
      Rejected: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: Clock,
      },
      "In-Transit": {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Clock,
      },
      Received: {
        color: "bg-purple-100 text-purple-800 border-purple-200",
        icon: Clock,
      },
      Refunded: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle,
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig["Requested"];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <div className="relative h-16 w-16 flex-shrink-0">
        <Image
          src={
            product.Product.images[0] || "/placeholder.svg?height=64&width=64"
          }
          alt={product.Product.name}
          fill
          className="object-cover rounded-md"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{product.Product.name}</h4>
        <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
          <span>Qty: {product.quantity}</span>
          <span>{formatCurrency(product.price)}</span>
          {product.selectedSize && (
            <span>Size: {product.selectedSize.size}</span>
          )}
        </div>

        {existingReturn && (
          <div className="mt-2">
            {getReturnStatusBadge(existingReturn.status)}
            <p className="text-xs text-muted-foreground mt-1">
              Return requested:{" "}
              {new Date(existingReturn.requestedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0">
        {existingReturn ? (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Return Status</p>
            {getReturnStatusBadge(existingReturn.status)}
          </div>
        ) : !canReturn ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRequestReturn(product)}
            className="flex items-center space-x-1"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Return</span>
          </Button>
        ) : (
          <Badge variant="secondary" className="text-xs">
            Cannot Return
          </Badge>
        )}
      </div>
    </div>
  );
}

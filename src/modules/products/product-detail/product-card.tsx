import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type ProductsOutput = inferProcedureOutput<
  AppRouter["home"]["getPublicProducts"]
>;
type Product = ProductsOutput["products"][number];

interface ProductCardProps {
  product: Product;
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`w-4 h-4 ${
        i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
      }`}
    />
  ));
};

export const ProductCard = ({ product }: ProductCardProps) => (
  <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-0">
    <div className="relative overflow-hidden rounded-t-lg">
      <Image
        src={product.images[0] || "/placeholder.svg?height=200&width=300"}
        height={200}
        width={300}
        alt={product.name}
        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
      />
      {product.isVerifiedProduct && (
        <Badge className="absolute top-2 left-2 bg-soraxi-green text-white">
          <Shield className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      )}
      <Button
        size="sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ShoppingCart className="w-4 h-4" />
      </Button>
    </div>
    <CardContent className="p-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">{renderStars(product.rating)}</div>
          <span className="text-sm text-muted-foreground">
            ({product.rating})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-soraxi-green">
            {product.formattedPrice}
          </span>
          <Badge variant="outline">{product.category[0]}</Badge>
        </div>
        {/* <p className="text-sm text-muted-foreground">by {product.storeName}</p> */}
      </div>
    </CardContent>
  </Card>
);

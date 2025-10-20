import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { getCategoryName } from "@/constants/constant";
import { addNairaSign } from "@/lib/utils/naira";
import { Shield, Star } from "lucide-react";
import Image from "next/image";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price?: number;
    images?: string[];
    category?: string[];
    rating?: number;
    slug: string;
    isVerifiedProduct?: boolean;
  };
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
  <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-0 gap-2">
    <CardHeader className="p-0">
      <div className="relative overflow-hidden rounded-t-lg">
        <Image
          src={
            (product.images && product.images[0]) || siteConfig.placeHolderImg
          }
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
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors truncate">
          {product.name}
        </h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            {renderStars(product.rating || 0)}
          </div>
          <span className="text-sm text-muted-foreground">
            ({product.rating ? product.rating.toFixed(1) : 0} reviews)
          </span>
        </div>
        <div className="flex items-center space-x-2 justify-between truncate">
          <span className="text-2xl font-bold text-soraxi-green">
            {addNairaSign(product.price || 0)}
          </span>
          {product.category && getCategoryName(product.category[0]) && (
            <Badge variant="outline" className="text-xs">
              {getCategoryName(product.category[0])}
            </Badge>
          )}
        </div>
        {/* <p className="text-sm text-muted-foreground">by {product.storeName}</p> */}
      </div>
    </CardContent>
  </Card>
);

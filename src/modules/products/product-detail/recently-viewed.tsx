"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface RecentlyViewedProps {
  excludeProductId?: string;
}

export function RecentlyViewed({ excludeProductId }: RecentlyViewedProps) {
  const { items } = useRecentlyViewed();
  const products = items.filter((item) => item.productId !== excludeProductId);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recently Viewed</h2>

      <Carousel
        opts={{
          align: "start",
          slidesToScroll: 1,
        }}
        plugins={[Autoplay()]}
        className="w-full px-4"
      >
        <CarouselContent>
          {products.map((product) => (
            <CarouselItem
              key={product.productId}
              className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <Link href={`/products/${product.slug}`}>
                <Card className="group cursor-pointer hover:shadow-lg transition-shadow p-0 h-full rounded-sm">
                  <CardContent className="p-0">
                    <div className="relative aspect-square overflow-hidden rounded-t-sm">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.isVerifiedProduct && (
                        <Badge className="absolute top-2 left-2 bg-soraxi-green text-white px-1.5 py-0.5 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-soraxi-green transition-colors">
                        {product.name}
                      </h3>
                      <span className="font-bold text-sm text-soraxi-green">
                        {product.formattedPrice}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="bg-soraxi-green dark:bg-soraxi-green-dark dark:hover:bg-soraxi-green-hover dark:text-white -left-0 hover:bg-soraxi-green-hover text-white hover:text-white border-none" />
        <CarouselNext className="bg-soraxi-green dark:bg-soraxi-green-dark dark:hover:bg-soraxi-green-hover dark:text-white -right-0 text-white hover:bg-soraxi-green-hover hover:text-white border-none" />
      </Carousel>
    </div>
  );
}

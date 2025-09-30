"use client";

import * as React from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";
import { siteConfig } from "@/config/site";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    name: "Aisha",
    role: "Fashion Vendor",
    message: `${siteConfig.name} made selling easy. I got my first 10 orders within a week!`,
    image: "/testimonials/aisha.jpg",
  },
  {
    name: "Emeka",
    role: "Electronics",
    message: "No tech skills needed. I launched in 5 minutes!",
    image: "/testimonials/emeka.jpg",
  },
  {
    name: "Zainab",
    role: "Beauty Products",
    message: "Customer support is top-notch!",
    image: "/testimonials/zainab.jpg",
  },
  {
    name: "Tobi",
    role: "Handmade Crafts",
    message: "Payments are seamless. No hassles at all.",
    image: "/testimonials/tobi.jpg",
  },
  {
    name: "Chinedu",
    role: "Groceries",
    message: "Love the escrow system. I feel protected.",
    image: "/testimonials/chinedu.jpg",
  },
];

export default function SellerTestimonials() {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="pt-10">
      <h2 className="text-3xl font-bold text-center mb-6">
        Hear from Our Sellers
      </h2>

      <div className={cn("mx-auto w-full max-w-xl")}>
        <Carousel
          plugins={[
            Autoplay({
              delay: 5000,
            }),
          ]}
          setApi={setApi}
          className={cn("w-full", isMobile && `my-16`)}
          orientation={isMobile ? `vertical` : `horizontal`}
        >
          <CarouselContent className={isMobile ? `h-62` : ``}>
            {testimonials.map((t, index) => (
              <CarouselItem key={index}>
                <Card className="text-center shadow-lg p-4">
                  <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden border">
                      <Image
                        src={t.image}
                        alt={t.name}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    </div>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      &#34;{t.message}&#34;
                    </p>
                    <p className="mt-2 font-semibold text-sm text-soraxi-green">
                      — {t.name}, {t.role}
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <div className="text-muted-foreground py-2 text-center text-sm">
          {current} of {count}
        </div>
      </div>
    </div>
  );
}

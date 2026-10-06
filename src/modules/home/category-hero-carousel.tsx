"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { Lock, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const ILLUSTRATIONS_BASE = "/svg/soraxi-hero-illustrations";

type Illustration = {
  src: string;
  width: number;
  height: number;
  className: string;
};

type Slide = {
  categorySlug: string;
  categoryLabel: string;
  headline: string;
  subtext: string;
  background: string;
  headingColor: string;
  bodyColor: string;
  ctaClassName: string;
  circleClassName: string;
  illustrations: Illustration[];
};

const SLIDES: Slide[] = [
  {
    categorySlug: "fashion-accessories",
    categoryLabel: "Fashion & Accessories",
    headline: "Fresh fits, delivered to you.",
    // headline: "Fresh fits, delivered to your hostel.",
    subtext:
      "Shoes, bags and accessories from verified vendors in Calabar. Your money is held safely until it arrives.",
    background: "bg-[#14a800]",
    headingColor: "text-neutral-900",
    bodyColor: "text-neutral-900/80",
    ctaClassName: "bg-white text-neutral-900 hover:bg-white/90",
    circleClassName: "bg-white/15",
    illustrations: [
      {
        src: `${ILLUSTRATIONS_BASE}/fashion-watch.svg`,
        width: 90,
        height: 112,
        className: "absolute left-2 top-2",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/fashion-handbag.svg`,
        width: 190,
        height: 170,
        className: "absolute right-0 top-0",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/fashion-sneaker.svg`,
        width: 230,
        height: 140,
        className: "absolute bottom-0 left-8",
      },
    ],
  },
  {
    categorySlug: "electronics-gadgets",
    categoryLabel: "Electronics & Gadgets",
    headline: "Charge up your semester.",
    subtext:
      "Phones, earbuds, chargers and more. The vendor only gets paid once it's in your hands.",
    background: "bg-[#0d1f10]",
    headingColor: "text-white",
    bodyColor: "text-white/80",
    ctaClassName: "bg-[#14a800] text-white hover:bg-[#128a00]",
    circleClassName: "bg-white/10",
    illustrations: [
      {
        src: `${ILLUSTRATIONS_BASE}/electronics-headphones.svg`,
        width: 190,
        height: 160,
        className: "absolute left-0 top-6",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/electronics-phone.svg`,
        width: 110,
        height: 170,
        className: "absolute right-6 top-0",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/electronics-earbuds.svg`,
        width: 130,
        height: 110,
        className: "absolute bottom-0 right-0",
      },
    ],
  },
  {
    categorySlug: "books-stationery",
    categoryLabel: "Books & Stationery",
    headline: "Ace this semester. We've got the supplies.",
    subtext:
      "Textbooks, notebooks, calculators and everyday stationery from vendors near campus.",
    background: "bg-[#eaf5e6]",
    headingColor: "text-neutral-900",
    bodyColor: "text-neutral-700",
    ctaClassName: "bg-[#14a800] text-white hover:bg-[#128a00]",
    circleClassName: "bg-[#14a800]/10",
    illustrations: [
      {
        src: `${ILLUSTRATIONS_BASE}/books-calculator.svg`,
        width: 140,
        height: 160,
        className: "absolute left-2 top-4",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/books-notebook.svg`,
        width: 150,
        height: 190,
        className: "absolute right-2 top-0",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/books-stack.svg`,
        width: 210,
        height: 110,
        className: "absolute bottom-0 left-10",
      },
    ],
  },
  {
    categorySlug: "beauty-personal-care",
    categoryLabel: "Beauty & Personal Care",
    headline: "Glow up, without the guesswork.",
    subtext:
      "Skincare, haircare and grooming with reviews from real buyers, so you know what you're getting.",
    background: "bg-[#1f4d22]",
    headingColor: "text-white",
    bodyColor: "text-white/80",
    ctaClassName: "bg-white text-[#1f4d22] hover:bg-white/90",
    circleClassName: "bg-white/10",
    illustrations: [
      {
        src: `${ILLUSTRATIONS_BASE}/beauty-lotion.svg`,
        width: 120,
        height: 190,
        className: "absolute left-6 top-0",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/beauty-serum.svg`,
        width: 110,
        height: 160,
        className: "absolute left-[150px] top-8",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/beauty-lipstick.svg`,
        width: 70,
        height: 150,
        className: "absolute right-4 top-4",
      },
    ],
  },
  {
    categorySlug: "groceries-essentials",
    categoryLabel: "Groceries & Essentials",
    headline: "Restock without leaving your room.",
    subtext:
      "Noodles, drinks, toiletries and everyday essentials, delivered to your hostel.",
    background: "bg-[#dff2da]",
    headingColor: "text-neutral-900",
    bodyColor: "text-neutral-700",
    ctaClassName: "bg-neutral-900 text-white hover:bg-neutral-800",
    circleClassName: "bg-[#14a800]/10",
    illustrations: [
      {
        src: `${ILLUSTRATIONS_BASE}/groceries-bag.svg`,
        width: 190,
        height: 200,
        className: "absolute left-0 bottom-0",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/groceries-noodles.svg`,
        width: 110,
        height: 150,
        className: "absolute left-[180px] bottom-2",
      },
      {
        src: `${ILLUSTRATIONS_BASE}/groceries-water.svg`,
        width: 60,
        height: 170,
        className: "absolute right-6 bottom-0",
      },
    ],
  },
];

/**
 * Home-page hero: a 5-slide, auto-rotating carousel of category promos, one
 * per product category. Replaces the previous coupon/product banner.
 */
export function CategoryHeroCarousel() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    setSelectedIndex(api.selectedScrollSnap());
    api.on("select", () => {
      setSelectedIndex(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api],
  );

  return (
    <section className="relative">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 10000, stopOnInteraction: false })]}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {SLIDES.map((slide) => (
            <CarouselItem key={slide.categorySlug} className="pl-0">
              <div
                className={cn(
                  "relative overflow-hidden py-14",
                  slide.background,
                )}
              >
                <div className="mx-auto max-w-7xl px-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    {/* LEFT — copy */}
                    <div className="space-y-5">
                      <h1
                        className={cn(
                          "text-4xl md:text-5xl font-bold leading-tight",
                          slide.headingColor,
                        )}
                      >
                        {slide.headline}
                      </h1>

                      <p
                        className={cn(
                          "text-base md:text-lg max-w-lg",
                          slide.bodyColor,
                        )}
                      >
                        {slide.subtext}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <Button
                          asChild
                          size="lg"
                          className={cn(
                            "rounded-md font-semibold",
                            slide.ctaClassName,
                          )}
                        >
                          <Link href={`/category/${slide.categorySlug}`}>
                            Shop {slide.categoryLabel.split(" ")[0]}
                          </Link>
                        </Button>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-sm",
                            slide.bodyColor,
                          )}
                        >
                          <Lock className="h-4 w-4" />
                          Payment held safely until delivery
                        </span>
                      </div>
                    </div>

                    {/* RIGHT — illustration cluster */}
                    <div className="relative hidden sm:block h-[260px] md:h-[320px]">
                      <div
                        className={cn(
                          "absolute right-4 top-1/2 -translate-y-1/2 h-56 w-56 md:h-72 md:w-72 rounded-full",
                          slide.circleClassName,
                        )}
                      />
                      <div className="relative h-full w-full max-w-md ml-auto">
                        {slide.illustrations.map((illustration) => (
                          <Image
                            key={illustration.src}
                            src={illustration.src}
                            alt=""
                            width={illustration.width}
                            height={illustration.height}
                            className={illustration.className}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4 mt-10">
                    <button
                      type="button"
                      aria-label="Previous slide"
                      onClick={() => api?.scrollPrev()}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                        slide.headingColor,
                        "border-current/30 hover:bg-current/10",
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next slide"
                      onClick={() => api?.scrollNext()}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
                        slide.headingColor,
                        "border-current/30 hover:bg-current/10",
                      )}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-2 ml-2">
                      {SLIDES.map((dotSlide, dotIndex) => (
                        <button
                          key={dotSlide.categorySlug}
                          type="button"
                          aria-label={`Go to slide ${dotIndex + 1}`}
                          onClick={() => scrollTo(dotIndex)}
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            dotIndex === selectedIndex
                              ? cn("w-6", slide.headingColor, "bg-current")
                              : cn("w-1.5", slide.bodyColor, "bg-current/40"),
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { addNairaSign, formatNaira } from "@/lib/utils/naira";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { siteConfig } from "@/config/site";
import Image from "next/image";
import Link from "next/link";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Output = inferProcedureOutput<AppRouter["home"]["getPublicProducts"]>;
type Products = Output["products"];

export function HomeHero({ products }: { products: Products }) {
  const trpc = useTRPC();
  const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(
    trpc.coupon.getHomepageCoupons.queryOptions(),
  );

  // Maximum of 2 coupons
  const coupons = data?.coupons?.slice(0, 2) ?? [];

  // Maximun of 4 products for the hero section
  const heroProducts = products.slice(0, 4);

  const handleCopy = async (code: string, couponId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCouponId(couponId);

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedCouponId(null);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      setCopiedCouponId(couponId);
      setTimeout(() => {
        setCopiedCouponId(null);
      }, 2000);
    }
  };

  return (
    <section className="relative bg-gradient-to-r from-soraxi-green to-soraxi-green/80 text-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* LEFT SIDE — TEXT CONTENT */}
          <div className="space-y-6">
            {/* Main Headline */}
            <motion.h1
              className="text-5xl font-bold leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Discover Amazing Products from Trusted Brands
            </motion.h1>

            {/* Sub Text */}
            <motion.p
              className="text-xl opacity-90"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            >
              {/* Shop with confidence from our curated marketplace of trusted
              sellers offering quality products at great prices. */}
              Shop with confidence in a curated marketplace featuring verified
              brands offering quality products at great prices.
            </motion.p>
          </div>

          {/* RIGHT SIDE — REEL-STYLE TICKETS */}
          {!isLoading && coupons.length > 0 && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* ✅ Ticket stack container */}
              <div className="flex flex-col gap-6 max-w-md">
                {coupons.map((coupon, index) => {
                  const discountText =
                    coupon.type === "percentage"
                      ? `${coupon.value}% OFF`
                      : `${formatNaira(coupon.value)} OFF`;

                  const isCopied = copiedCouponId === coupon._id.toString();

                  return (
                    <div
                      key={coupon._id.toString()}
                      className="relative bg-white text-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-white h-32 w-full shrink-0"
                      style={{
                        transform: `rotate(${index === 0 ? "-1.5" : "1.5"}deg)`,
                      }}
                    >
                      {/* ✅ Ticket perforations (left side) */}
                      <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-3">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-soraxi-green"
                          />
                        ))}
                      </div>

                      {/* ✅ Ticket perforations (right side) */}
                      <div className="absolute right-2 top-0 bottom-0 flex flex-col justify-between py-3">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-soraxi-green"
                          />
                        ))}
                      </div>

                      {/* ✅ Ticket header strip */}
                      <div className="absolute top-0 left-0 right-0 h-3 bg-soraxi-green" />

                      {/* ✅ Ticket content */}
                      <div className="p-4 h-full flex items-center justify-between">
                        {/* Left side: Coupon details */}
                        <div className="flex-1 pl-6">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-soraxi-green/20 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-soraxi-green rounded-full" />
                            </div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              UNICAL Exclusive
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900">
                            {discountText}
                          </h3>
                          {coupon.minOrderValue && (
                            <p className="text-xs text-gray-600 mt-0.5">
                              Valid on orders above{" "}
                              {formatNaira(coupon.minOrderValue)}
                            </p>
                          )}
                        </div>

                        {/* Right side: Code and CTA */}
                        <div className="flex flex-col items-end gap-3 pr-4">
                          <div className="text-center">
                            <div className="text-[10px] font-medium text-gray-500 mb-0.5">
                              USE CODE
                            </div>
                            <div className="bg-gray-100 border border-gray-300 px-3 py-1.5 rounded-md">
                              <code className="font-mono font-bold text-gray-900 text-sm tracking-widest">
                                {coupon.code}
                              </code>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleCopy(coupon.code, coupon._id.toString())
                            }
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm min-w-[70px] ${
                              isCopied
                                ? "bg-soraxi-green text-white hover:bg-soraxi-green-hover hover:cursor-copy"
                                : "bg-soraxi-green text-white hover:cursor-copy"
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* ✅ Bottom decorative line */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200" />
                    </div>
                  );
                })}

                {/* ✅ Ticket stub indicator */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  <span className="text-xs text-white/80 ml-2">
                    {coupons.length} active coupon{coupons.length > 1 && "s"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Product cards section. Display when no coupons are active */}
          {!isLoading && coupons.length < 1 && heroProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 gap-4 max-w-md"
            >
              {heroProducts.map((product, index) => (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  <motion.div
                    key={product.id}
                    className="bg-white rounded-xl shadow-lg p-3"
                    style={{
                      transform: `rotate(${index % 2 === 0 ? "-2" : "2"}deg)`,
                    }}
                    whileHover={{ scale: 1.03 }}
                  >
                    <div className="aspect-auto bg-gray-100 rounded-lg mb-2 overflow-hidden">
                      <Image
                        src={
                          (product.images && product.images[0]) ||
                          siteConfig.placeHolderImg
                        }
                        height={200}
                        width={300}
                        alt={product.name}
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {product.name}
                    </h4>

                    <p className="text-sm font-bold text-soraxi-green">
                      {addNairaSign(product.price || 0)}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}

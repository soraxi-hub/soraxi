"use client";

import Link from "next/link";
import { ProductImageGallery } from "./product-image-gallery";
import { ProductInfo } from "./product-info";
import { ProductTabs } from "./product-tabs";
import { RelatedProducts } from "./related-products";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { slugify } from "@/constants/constant";
import { siteConfig } from "@/config/site";

type ProductsOutput = inferProcedureOutput<
  AppRouter["home"]["getPublicProductBySlug"]
>;
type Product = ProductsOutput["product"];

type RelatedProductsOutput = inferProcedureOutput<
  AppRouter["home"]["getRelatedProducts"]
>;
type RelatedProduct = RelatedProductsOutput;

interface ProductDetailPageProps {
  product: Product;
  relatedProducts: RelatedProduct;
}

export function ProductDetailPage({
  product,
  relatedProducts,
}: ProductDetailPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {product && (
        <div className="mx-auto px-4 py-8 max-w-7xl">
          {/* Breadcrumb with Shadcn UI */}
          <Breadcrumb className="mb-6 hidden md:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/category">Category</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              {product.category?.length ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href={`/category/${slugify(product.category[0])}`}
                    >
                      {product.category[0]}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {product.subCategory?.length ? (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href={`/category/${slugify(
                            product.category[0]
                          )}/${slugify(product.subCategory[0])}`}
                        >
                          {product.subCategory[0]}
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                </>
              ) : null}

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Product + Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
            <div>
              <ProductImageGallery
                images={
                  (product.images && product.images) || [
                    siteConfig.placeHolderImg,
                  ]
                }
                productName={product.name}
                isVerifiedProduct={product.isVerifiedProduct}
              />
            </div>
            <div>
              <ProductInfo product={product} />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-12">
            <ProductTabs
              description={product.description || ""}
              specifications={product.specifications || ""}
              productId={product.id}
            />
          </div>

          {/* Related */}
          <RelatedProducts products={relatedProducts} />
        </div>
      )}
    </div>
  );
}

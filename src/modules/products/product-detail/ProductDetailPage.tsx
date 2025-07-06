"use client";

import Link from "next/link";
import { ProductImageGallery } from "./ProductImageGallery";
import { ProductInfo } from "./ProductInfo";
import { ProductTabs } from "./ProductTabs";
import { RelatedProducts } from "./RelatedProducts";

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
      <div className="container mx-auto px-4 py-8">
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

            <BreadcrumbItem>
              <BreadcrumbLink href={`/category/${product.category[0]}`}>
                {product.category[0]}
              </BreadcrumbLink>
            </BreadcrumbItem>

            {product.subCategory[0] && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href={`/category/${product.category[0]}/${product.subCategory[0]}`}
                  >
                    {product.subCategory[0]}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}

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
              images={product.images}
              productName={product.name}
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
    </div>
  );
}

import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/modules/products/product-detail/ProductDetailPage";
import { caller } from "@/trpc/server";
import { cache } from "react";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const getProduct = cache(async (slug: string) => {
  const { product } = await caller.home.getPublicProductBySlug({ slug });
  return product;
});

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return {};

  return {
    title: `${product.name}`,
    description:
      product.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
      `Buy ${product.name} online`,
    openGraph: {
      title: product.name,
      description: product.description?.replace(/<[^>]*>/g, "").slice(0, 160),
      images: product.images.map((image) => ({
        url: image,
        alt: product.name,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description?.replace(/<[^>]*>/g, "").slice(0, 160),
      images: product.images,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const relatedProducts = await caller.home.getRelatedProducts({ slug });

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailPage product={product} relatedProducts={relatedProducts} />
  );
}

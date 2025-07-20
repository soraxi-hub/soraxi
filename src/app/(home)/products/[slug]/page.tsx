import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/modules/products/product-detail/ProductDetailPage";
import { caller } from "@/trpc/server";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product } = await caller.home.getPublicProductBySlug({ slug });

  return {
    title: `${product.name} | Your Store`,
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
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product } = await caller.home.getPublicProductBySlug({ slug });
  const relatedProducts = await caller.home.getRelatedProducts({ slug });

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailPage product={product} relatedProducts={relatedProducts} />
  );
}

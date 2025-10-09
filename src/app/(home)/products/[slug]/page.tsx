import { notFound } from "next/navigation";
import { ProductDetailPage } from "@/modules/products/product-detail/product-detail-page";
import { caller } from "@/trpc/server";
import { cache } from "react";
import { StoreStatusEnum } from "@/validators/store-validators";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

const getProduct = cache(async (slug: string) => {
  const data = await caller.home.getPublicProductBySlug({ slug });
  return data;
});

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const { product } = await getProduct(slug);

  if (!product) return {};

  return {
    title: `${product.name}`,
    description:
      product.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
      `Buy ${product.name} online`,
    openGraph: {
      title: product.name,
      description: product.description?.replace(/<[^>]*>/g, "").slice(0, 160),
      images: (product.images ?? []).map((image) => ({
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
  const { product, storeStatus } = await getProduct(slug);

  if (!product) {
    notFound();
  }

  if (storeStatus !== StoreStatusEnum.Active) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <h2 className="text-xl font-semibold text-red-800 mb-2">
          Product temporarily unavailable
        </h2>
        <p className="text-gray-600 mb-6 dark:text-slate-200">
          This product is currently unavailable for purchase. Please check back
          soon — we hope to have it back shortly!
        </p>
      </div>
    );
  }

  // only query for related products when the store status check is a success.
  const relatedProducts = await caller.home.getRelatedProducts({ slug });

  return (
    <ProductDetailPage product={product} relatedProducts={relatedProducts} />
  );
}

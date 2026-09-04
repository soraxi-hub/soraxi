import type { Metadata } from "next";
import { caller } from "@/trpc/server";
import { siteConfig } from "@/config/site";
import { truncateAtWordBoundary } from "@/constants/constant";

interface RequestLayoutProps {
  params: Promise<{ requestId: string }>;
  children: React.ReactNode;
}

/**
 * Each request is genuinely unique content — a student's own words about
 * what they want — so unlike the list and form pages either side of it, this
 * one is worth a real, per-item title and description rather than a static
 * fallback or a blanket noindex.
 */
export async function generateMetadata({
  params,
}: RequestLayoutProps): Promise<Metadata> {
  const { requestId } = await params;
  const result = await caller.demandListing.getRequestById({ requestId });

  if (!result.success || !result.request) {
    return { title: "Request Not Found" };
  }

  const { request } = result;
  const description = request.description
    ? truncateAtWordBoundary(request.description)
    : `A product request posted on ${siteConfig.name}.`;

  return {
    title: request.title,
    description,
    openGraph: {
      type: "website",
      title: request.title,
      description,
    },
  };
}

export default function RequestDetailLayout({ children }: RequestLayoutProps) {
  return children;
}

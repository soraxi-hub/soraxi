import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import CreateStoreSkeleton from "@/modules/skeletons/create-store-skeleton";
import { CreateStorePage } from "@/modules/store/store-creation";

export const metadata: Metadata = {
  title: `Create Store | ${siteConfig.siteTitle}`,
  description:
    "Create a new store on our platform by filling out the form below.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function Page() {
  return (
    <Suspense fallback={<CreateStoreSkeleton />}>
      <CreateStorePage />
    </Suspense>
  );
}

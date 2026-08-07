import type { Metadata } from "next";
import { Suspense } from "react";

import { DeliveryConfirmationPage } from "@/modules/delivery/delivery-confirmation-page";

/**
 * Rider delivery confirmation — `/d/[token]`.
 *
 * Sits outside every route group on purpose: no header, no sidebar, no
 * authentication. The person opening it is not a Soraxi user and should see one
 * self-contained card and nothing else.
 *
 * The path is kept short because riders are sometimes sent the link over a
 * channel that mangles it, and someone will end up retyping it.
 */
export const metadata: Metadata = {
  title: "Confirm delivery",
  // Delivery links must never be indexed: they are unlisted, disposable URLs
  // and a crawler following one would burn a real link into search results.
  robots: { index: false, follow: false, nocache: true },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

async function Page({ params }: PageProps) {
  const { token } = await params;

  return (
    <Suspense>
      <DeliveryConfirmationPage token={token} />
    </Suspense>
  );
}

export default Page;

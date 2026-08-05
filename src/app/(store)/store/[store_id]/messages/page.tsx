import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { MessagingPage } from "@/modules/messaging/messaging-page";

export const metadata: Metadata = {
  title: "Messages",
};

interface PageProps {
  params: Promise<{ store_id: string }>;
}

/**
 * Vendor inbox at `/store/[store_id]/messages`.
 *
 * The store id in the path is checked against the session rather than trusted:
 * the messaging procedures already scope every query to the authenticated
 * store, but a vendor landing on someone else's URL should be redirected to
 * their own inbox, not shown an empty one.
 */
async function Page({ params }: PageProps) {
  const { store_id } = await params;
  const store = await getStoreFromCookie();

  if (!store) redirect("/login");
  if (store.id !== store_id) redirect(`/store/${store.id}/messages`);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <Suspense>
        <MessagingPage role="vendor" />
      </Suspense>
    </div>
  );
}

export default Page;

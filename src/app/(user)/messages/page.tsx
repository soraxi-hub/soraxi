import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { MessagingPage } from "@/modules/messaging/messaging-page";

export const metadata: Metadata = {
  title: "Messages",
};

/**
 * Customer inbox at `/messages`.
 *
 * The open conversation lives in `?c=<id>`, so a thread is linkable and the
 * back gesture moves between list and thread on mobile without bespoke history
 * handling. That query state is read client-side, hence the Suspense boundary.
 */
async function Page() {
  const user = await getUserFromCookie();

  if (!user) redirect("/sign-in");

  return (
    <div className="py-4 sm:py-6">
      <Suspense>
        <MessagingPage role="customer" />
      </Suspense>
    </div>
  );
}

export default Page;

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import "../globals.css";
import { AdminLayout } from "@/modules/admin/admin-layout";
import { getAdminFromCookie } from "@/lib/helpers/get-admin-from-cookie";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await getAdminFromCookie();
  return <AdminLayout admin={admin!}>{children}</AdminLayout>; // Non-null assertion operator is used here because we assume the admin will always be present in this layout since I have authentication middleware in place
}

import "../../../globals.css";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { StoreSidebar } from "@/modules/store/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const store = await getStoreFromCookie();
  if (!store) {
    redirect(`/login`);
  }
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <StoreSidebar store={store} />
      <SidebarInset>
        <SidebarTrigger className="fixed top-[5rem] left-2 sm:left-4 text-soraxi-green hover:text-soraxi-green-hover animate-pulse" />
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

import type { Metadata } from "next";
import "../../globals.css";

import { siteConfig } from "@/config/site";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/modules/user/components/app-sidebar";
import { cookies } from "next/headers";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

export const metadata: Metadata = {
  title: siteConfig.siteTitle,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const user = await getUserFromCookie();
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <SidebarInset>
        <SidebarTrigger className="fixed top-[8rem]" />
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

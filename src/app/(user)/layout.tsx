import type { Metadata } from "next";
import "../globals.css";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/modules/user/components/app-sidebar";
import { cookies } from "next/headers";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { HomeHeader } from "@/components/layout/home/home-nav";
import { Fragment } from "react";

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
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";
  const user = await getUserFromCookie();
  return (
    <Fragment>
      <HomeHeader />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar user={user} />
        <SidebarInset>
          <SidebarTrigger className="fixed md:top-[8rem] top-[12rem] left-2 sm:left-4 text-soraxi-green hover:text-soraxi-green-hover animate-pulse" />
          <main className="px-6 lg:px-14">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </Fragment>
  );
}

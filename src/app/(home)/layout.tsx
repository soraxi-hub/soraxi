import type { Metadata } from "next";
import "../globals.css";
import { HomeFooter } from "@/components/layout/home/home-footer";
import { HomeHeader } from "@/components/layout/home/home-nav";
import { Fragment } from "react";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: siteConfig.siteTitle,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Fragment>
      <HomeHeader />
      <main className="min-h-screen">{children}</main>
      <HomeFooter />
    </Fragment>
  );
}

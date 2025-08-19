import { StoreHeader } from "@/components/layout/store/nav";
import "../globals.css";
import type { Metadata } from "next";
import { Fragment } from "react";
import { siteConfig } from "@/config/site";

// Metadata for the application
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
      <StoreHeader />
      {children}
    </Fragment>
  );
}

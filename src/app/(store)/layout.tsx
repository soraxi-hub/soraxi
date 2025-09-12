import { StoreHeader } from "@/components/layout/store/nav";
import "../globals.css";
import type { Metadata } from "next";
import { Fragment } from "react";

export const metadata: Metadata = {
  robots: {
    index: false, // ✅ best practice: prevent indexing cart pages
    follow: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
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

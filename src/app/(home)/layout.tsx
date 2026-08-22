import "../globals.css";
import { HomeFooter } from "@/components/layout/home/home-footer";
import { HomeHeader } from "@/components/layout/home/home-nav";
import { Fragment } from "react";

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

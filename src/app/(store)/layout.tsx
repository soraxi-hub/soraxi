import { StoreHeader } from "@/components/layout/store/nav";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { FeedbackPageEnum } from "@/enums";
import "../globals.css";
import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Fragment>
      <StoreHeader />
      {children}
      <FeedbackButton page={FeedbackPageEnum.StoreDashboard} />
    </Fragment>
  );
}

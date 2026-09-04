import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Product Requests",
  description: `Browse product requests posted by students on ${siteConfig.name}, or post your own to let campus vendors reach out with offers.`,
};

export default function RequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

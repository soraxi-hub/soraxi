import type { Metadata } from "next";

// Only the request's own author can meaningfully use this page, and its
// content duplicates the detail page it edits.
export const metadata: Metadata = {
  title: "Edit Request",
  description: "Update the details of your product request.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function EditRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

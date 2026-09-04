import type { Metadata } from "next";

// A bare submission form with no unique content of its own — nothing here
// differs between visits, so it isn't worth a search result.
export const metadata: Metadata = {
  title: "Post a Request",
  description: "Tell campus vendors what you're looking for.",
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function NewRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

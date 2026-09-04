import type { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Dispute Details",
    "Case evidence, timeline, and resolution controls for this dispute."
  );
}

export default function StoreDisputeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

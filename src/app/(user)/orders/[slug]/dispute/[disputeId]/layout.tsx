import type { Metadata } from "next";
import { generateUserMetadata } from "@/lib/helpers/generate-user-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateUserMetadata(
    "Dispute Details",
    "Track the status and evidence for your order dispute."
  );
}

export default function UserDisputeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

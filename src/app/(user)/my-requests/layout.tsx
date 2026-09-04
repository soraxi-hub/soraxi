import type { Metadata } from "next";
import { generateUserMetadata } from "@/lib/helpers/generate-user-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateUserMetadata(
    "My Requests",
    "View and manage the product requests you've posted."
  );
}

export default function MyRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

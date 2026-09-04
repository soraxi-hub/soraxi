import type { Metadata } from "next";
import { StoreManagement } from "@/modules/admin/stores/store-management";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stores",
  description: "Store management interface for administrators.",
};

export default function AdminStoresPage() {
  return <StoreManagement />;
}

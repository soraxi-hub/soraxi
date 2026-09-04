import type { Metadata } from "next";
import ManageAdminsPage from "@/modules/admin/manage-admins";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Admins",
  description: "Add, edit, and manage administrator accounts and roles.",
};

export default function Page() {
  return <ManageAdminsPage />;
}

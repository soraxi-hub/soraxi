import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Wallet",
  description: "Platform revenue from commissions and penalties.",
};

import PlatformWalletDashboard from "@/modules/admin/platform-wallet/platform-wallet-dashboard";

export default function PlatformWalletPage() {
  return <PlatformWalletDashboard />;
}

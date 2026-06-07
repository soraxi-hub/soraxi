export const dynamic = "force-dynamic";

import PlatformWalletDashboard from "@/modules/admin/platform-wallet/platform-wallet-dashboard";

/**
 * Admin Platform Wallet Page
 * Displays platform revenue from commissions and penalties.
 * Route: /admin/platform-wallet
 */
export default function PlatformWalletPage() {
  return <PlatformWalletDashboard />;
}

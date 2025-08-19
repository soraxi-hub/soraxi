"use client";

import { useState } from "react";
// import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletOverview } from "@/modules/store/wallet/WalletOverview";
import { TransactionHistory } from "@/modules/store/wallet/TransactionHistory";
import { WithdrawalRequest } from "@/modules/store/wallet/WithdrawalRequest";
import {
  Wallet,
  TrendingUp,
  // ArrowLeft
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Store Wallet Management Page
 *
 * Comprehensive wallet management interface for store owners.
 * Provides complete financial overview, transaction history,
 * and withdrawal functionality with professional UI/UX.
 *
 * Features:
 * - Real-time wallet balance and earnings display
 * - Comprehensive transaction history with filtering
 * - Secure withdrawal request system
 * - Professional financial reporting
 * - Mobile-responsive design
 * - Integration with store session management
 */

export default function StoreWalletPage({ storeId }: { storeId: string }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  /**
   * Handle successful withdrawal
   * Refreshes wallet data and closes withdrawal dialog
   */
  const handleWithdrawalSuccess = () => {
    // Refresh wallet data
    window.location.reload();
  };

  /**
   * Handle withdrawal button click
   * Opens withdrawal dialog and loads current balance
   */
  const handleWithdrawClick = (val: number) => {
    setWalletBalance(val);
    setShowWithdrawal(true);
  };

  /**
   * Handle transaction history navigation
   * Switches to transaction history tab
   */
  const handleTransactionHistoryClick = () => {
    setActiveTab("transactions");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button> */}
              <div>
                <h1 className="text-3xl font-bold text-foreground flex items-center">
                  {/* <Wallet className="w-8 h-8 mr-3 text-green-600" /> */}
                  Wallet Management
                </h1>
                <p className="text-muted-foreground">
                  Manage your earnings, view transactions, and request
                  withdrawals
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="overview" className="flex items-center">
              <Wallet className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* Wallet Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <WalletOverview
              onWithdrawClickAction={handleWithdrawClick}
              onTransactionHistoryClickAction={handleTransactionHistoryClick}
            />
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <TransactionHistory storeId={storeId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawal} onOpenChange={setShowWithdrawal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <WithdrawalRequest
            availableBalance={walletBalance}
            onWithdrawalSuccessAction={handleWithdrawalSuccess}
            onCloseAction={() => setShowWithdrawal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

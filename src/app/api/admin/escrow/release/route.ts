import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getAdminFromRequest } from "@/lib/admin/permissions";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/lib/admin/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/shared/roles";

/**
 * Admin Escrow Release Action API Route Handler
 *
 * Handles the actual release of escrow funds to seller wallets.
 * This is a critical financial operation that requires careful validation
 * and atomic transaction processing.
 *
 * Business Logic:
 * 1. Verify sub-order is eligible for escrow release
 * 2. Update escrow status (released = true, held = false)
 * 3. Credit seller's wallet with the escrow amount
 * 4. Create wallet transaction record
 * 5. Log all actions for audit purposes
 *
 * Security:
 * - Admin authentication and authorization
 * - Atomic database transactions with rollback
 * - Comprehensive validation and error handling
 * - Detailed audit logging
 *
 * @param request - Next.js request object with release data
 * @returns JSON response with release confirmation
 */
export async function POST(request: NextRequest) {
  let session: mongoose.ClientSession | null = null;

  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to release escrow funds.
     */
    const admin = getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Admin authentication required",
        },
        { status: 401 }
      );
    }

    // ==================== Request Validation ====================

    /**
     * Parse and Validate Request Body
     *
     * Extracts the sub-order ID and validates the request structure.
     */
    const body = await request.json();
    const { subOrderId, notes } = body;

    if (!subOrderId || typeof subOrderId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Sub-order ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
      return NextResponse.json(
        {
          error: "Invalid sub-order ID",
          message: "Please provide a valid sub-order ID",
        },
        { status: 400 }
      );
    }

    // ==================== Database Transaction Setup ====================

    /**
     * Start Database Session for Atomic Transaction
     *
     * All database operations must be atomic to ensure data consistency.
     * If any operation fails, all changes will be rolled back.
     */
    session = await mongoose.startSession();
    session.startTransaction();

    // ==================== Get Database Models ====================

    const Order = await getOrderModel();
    const Wallet = await getWalletModel();
    const WalletTransaction = await getWalletTransactionModel();
    const Store = await getStoreModel();

    // ==================== Find and Validate Sub-Order ====================

    /**
     * Find Sub-Order and Validate Eligibility
     *
     * Locates the specific sub-order and verifies it meets all criteria
     * for escrow release.
     */
    const orderWithSubOrder = await Order.findOne({
      "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
    })
      .populate({
        path: "user",
        select: "firstName lastName email",
      })
      .populate({
        path: "subOrders.store",
        select: "name storeEmail wallet",
      })
      .session(session);

    if (!orderWithSubOrder) {
      throw new Error("Order with specified sub-order not found");
    }

    // Find the specific sub-order
    const subOrder = orderWithSubOrder.subOrders.find(
      (so) => so._id?.toString() === subOrderId
    );

    if (!subOrder) {
      throw new Error("Sub-order not found");
    }

    // ==================== Eligibility Validation ====================

    /**
     * Comprehensive Eligibility Check
     *
     * Verifies all conditions are met for escrow release:
     * - Escrow is currently held
     * - Funds haven't been released yet
     * - Delivery is confirmed
     * - Return window has passed
     */
    const eligibilityErrors: string[] = [];

    if (!subOrder.escrow.held) {
      eligibilityErrors.push("Escrow is not currently held");
    }

    if (subOrder.escrow.released) {
      eligibilityErrors.push("Escrow has already been released");
    }

    if (subOrder.deliveryStatus !== "Delivered") {
      eligibilityErrors.push("Order has not been delivered");
    }

    if (new Date() <= subOrder.returnWindow) {
      eligibilityErrors.push("Return window has not yet passed");
    }

    if (eligibilityErrors.length > 0) {
      throw new Error(
        `Sub-order is not eligible for escrow release: ${eligibilityErrors.join(
          ", "
        )}`
      );
    }

    // ==================== Get or Create Seller Wallet ====================

    /**
     * Ensure Seller Has a Wallet
     *
     * Finds the seller's wallet or creates one if it doesn't exist.
     */
    let sellerWallet = await Wallet.findOne({ store: subOrder.store }).session(
      session
    );

    if (!sellerWallet) {
      throw new Error(`Store Wallet not found: storeId = ${subOrder.store}`);
    }
    // if (!sellerWallet) {
    //   // Create wallet if it doesn't exist
    //   sellerWallet = new Wallet({
    //     store: subOrder.store,
    //     balance: 0,
    //     pending: 0,
    //     totalEarned: 0,
    //     currency: "NGN",
    //   })
    //   await sellerWallet.save({ session })
    // }

    // ==================== Calculate Release Amount ====================

    /**
     * Calculate Escrow Release Amount
     *
     * The full sub-order amount will be released to the seller.
     * Platform fees would have been deducted during order creation.
     */
    const releaseAmount = subOrder.totalAmount;

    // ==================== Update Escrow Status ====================

    /**
     * Update Sub-Order Escrow Status
     *
     * Marks the escrow as released and no longer held.
     */
    subOrder.escrow.released = true;
    subOrder.escrow.held = false;
    subOrder.escrow.releasedAt = new Date();

    await orderWithSubOrder.save({ session });

    // ==================== Credit Seller Wallet ====================

    /**
     * Credit Seller's Wallet
     *
     * Adds the escrow amount to the seller's available balance.
     */
    sellerWallet.balance += releaseAmount;
    sellerWallet.totalEarned += releaseAmount;
    await sellerWallet.save({ session });

    // ==================== Create Wallet Transaction ====================

    /**
     * Record Wallet Transaction
     *
     * Creates a transaction record for the escrow release.
     */
    const walletTransaction = new WalletTransaction({
      wallet: sellerWallet._id,
      type: "credit",
      amount: releaseAmount,
      source: "order",
      description: `Escrow release for order ${orderWithSubOrder._id
        .toString()
        .substring(0, 8)
        .toUpperCase()}`,
      relatedOrderId: orderWithSubOrder._id,
    });

    await walletTransaction.save({ session });

    // ==================== Commit Transaction ====================

    /**
     * Commit All Changes
     *
     * If we reach this point, all operations were successful.
     * Commit the transaction to make all changes permanent.
     */
    await session.commitTransaction();

    // ==================== Prepare Response Data ====================

    /**
     * Format Response Data
     *
     * Prepares comprehensive response data for the admin interface.
     */
    const responseData = {
      success: true,
      message: "Escrow funds released successfully",
      release: {
        subOrderId: subOrder._id?.toString(),
        orderId: orderWithSubOrder._id.toString(),
        orderNumber: `ORD-${orderWithSubOrder._id
          .toString()
          .substring(0, 8)
          .toUpperCase()}`,
        subOrderNumber: `SUB-${subOrder._id
          ?.toString()
          .substring(0, 8)
          .toUpperCase()}`,
        amount: releaseAmount,
        currency: "NGN",
        releasedAt: subOrder.escrow.releasedAt?.toISOString(),
        seller: {
          id: subOrder.store._id?.toString(),
          name: (subOrder.store as any).name,
          email: (subOrder.store as any).storeEmail,
        },
        customer: {
          name: `${(orderWithSubOrder.user as any).firstName} ${
            (orderWithSubOrder.user as any).lastName
          }`,
          email: (orderWithSubOrder.user as any).email,
        },
        walletTransaction: {
          id: walletTransaction._id.toString(),
          newBalance: sellerWallet.balance,
        },
      },
    };

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the escrow release action for audit purposes.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.REFUND_APPROVED, // Using closest available action
      module: AUDIT_MODULES.FINANCE,
      details: {
        action: "escrow_release",
        subOrderId,
        orderId: orderWithSubOrder._id.toString(),
        amount: releaseAmount,
        sellerId: subOrder.store._id?.toString(),
        sellerName: (subOrder.store as any).name,
        customerEmail: (orderWithSubOrder.user as any).email,
        notes: notes || null,
        walletTransactionId: walletTransaction._id.toString(),
        newWalletBalance: sellerWallet.balance,
      },
    });

    // ==================== Response ====================

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    // ==================== Error Handling & Rollback ====================

    /**
     * Rollback Transaction on Error
     *
     * If any error occurs, rollback all database changes to maintain consistency.
     */
    if (session) {
      await session.abortTransaction();
    }

    console.error("Escrow release error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Escrow release failed",
          message: error.message,
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to release escrow funds. Please try again later.",
      },
      { status: 500 }
    );
  } finally {
    // ==================== Cleanup ====================

    /**
     * End Database Session
     *
     * Always end the session to free up resources.
     */
    if (session) {
      await session.endSession();
    }
  }
}

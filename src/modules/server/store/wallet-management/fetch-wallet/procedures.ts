import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getWalletModel } from "@/lib/db/models/wallet.model";
import mongoose from "mongoose";

/**
 * Store Wallet TRPC Router
 *
 * Handles wallet data retrieval and management for authenticated stores.
 * Provides secure access to wallet balance, pending amounts, and earnings
 * with comprehensive error handling and validation.
 *
 * Procedures:
 * - getWallet: Retrieve wallet information for authenticated store
 * - createWallet: Create wallet for new store (if needed)
 *
 * Security:
 * - Store session validation required
 * - Wallet ownership verification
 * - Input sanitization and validation
 */
export const storeWalletRouter = createTRPCRouter({
  /**
   * GET Handler - Retrieve Wallet Information
   *
   * Retrieves wallet information for the authenticated store.
   * Returns balance, pending amounts, total earnings, and metadata.
   */
  getWallet: baseProcedure.query(async ({ ctx }) => {
    const { store } = ctx;
    try {
      // Validate store session
      if (!store?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store session required",
        });
      }

      // Get wallet model
      const Wallet = await getWalletModel();

      // Find wallet for the authenticated store
      const wallet = await Wallet.findOne({ store: store.id })
        .select(
          "store balance pending totalEarned currency createdAt updatedAt"
        )
        .lean();

      // Handle case where wallet doesn't exist
      if (!wallet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Wallet not found for this store",
        });
      }

      // Format wallet data for client
      const formattedWallet = {
        _id: wallet._id.toString(),
        store: wallet.store.toString(),
        balance: wallet.balance || 0,
        pending: wallet.pending || 0,
        totalEarned: wallet.totalEarned || 0,
        currency: wallet.currency || "NGN",
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      };

      return {
        success: true,
        wallet: formattedWallet,
      };
    } catch (error) {
      console.error("Error fetching wallet data:", error);

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch wallet data",
      });
    }
  }),

  /**
   * POST Handler - Create New Wallet
   *
   * Creates a new wallet for the authenticated store.
   * Used during store onboarding or wallet initialization.
   */
  createWallet: baseProcedure
    .input(
      z.object({
        currency: z.string().default("NGN"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { store } = ctx;
      try {
        // Validate store session
        if (!store?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store session required",
          });
        }

        // Get wallet model
        const Wallet = await getWalletModel();

        // Check if wallet already exists
        const existingWallet = await Wallet.findOne({ store: store.id });
        if (existingWallet) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Wallet already exists for this store",
          });
        }

        // Create new wallet
        const newWallet = new Wallet({
          store: store.id,
          balance: 0,
          pending: 0,
          totalEarned: 0,
          currency: input.currency,
        });

        const savedWallet = await newWallet.save();

        // Format response
        const formattedWallet = {
          _id: (
            savedWallet._id as unknown as mongoose.Schema.Types.ObjectId
          ).toString(),
          store: savedWallet.store.toString(),
          balance: savedWallet.balance,
          pending: savedWallet.pending,
          totalEarned: savedWallet.totalEarned,
          currency: savedWallet.currency,
          createdAt: savedWallet.createdAt,
          updatedAt: savedWallet.updatedAt,
        };

        return {
          success: true,
          message: "Wallet created successfully",
          wallet: formattedWallet,
        };
      } catch (error) {
        console.error("Error creating wallet:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create wallet",
        });
      }
    }),
});

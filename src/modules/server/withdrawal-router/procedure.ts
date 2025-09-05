import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { getStoreModel } from "@/lib/db/models/store.model";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";
import { getWithdrawalRequestModel } from "@/lib/db/models/withdrawal-request.model";
import { getAdminModel } from "@/lib/db/models/admin.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/modules/admin/security/audit-logger";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { sendMail, wrapWithBrandedTemplate } from "@/services/mail.service";
import { siteConfig } from "@/config/site";
import { generateUniqueId } from "@/lib/utils";
import type { Role } from "@/modules/admin/security/roles";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import type {
  CreateWithdrawalRequestInput,
  CreateWithdrawalRequestResponse,
  GetWithdrawalRequestsResponse,
  FormattedWithdrawalRequestDetail,
  ApproveWithdrawalRequestInput,
  RejectWithdrawalRequestInput,
  AdminWithdrawalActionResponse,
  WithdrawalRequestDetailAggregationResult,
  WithdrawalAuditDetails,
  FormattedStoreWithdrawalRequestDetail,
} from "@/types/withdrawal-request-types";

/**
 * Withdrawal Request TRPC Router
 *
 * Handles all operations related to store withdrawal requests, including
 * creation by stores and management (listing, approval, rejection) by admins.
 */
export const withdrawalRouter = createTRPCRouter({
  /**
   * Store-facing: Create a new withdrawal request
   */
  createWithdrawalRequest: baseProcedure
    .input(
      z.object({
        amount: z
          .number()
          .positive("Amount must be positive")
          .min(100000, "Minimum withdrawal is ₦1,000"), // ₦1,000 in kobo
        bankAccountId: z.string().min(1, "Bank account is required"),
        description: z.string().optional(),
      })
    )
    .mutation(
      async ({ input, ctx }): Promise<CreateWithdrawalRequestResponse> => {
        const { store } = ctx;
        let session: mongoose.ClientSession | null = null;

        try {
          // Authenticate store
          if (!store?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Store authentication required",
            });
          }

          // Validate input
          const {
            amount,
            bankAccountId,
            description,
          }: CreateWithdrawalRequestInput = input;

          // Initialize models
          const StoreModel = await getStoreModel();
          const WalletModel = await getWalletModel();
          const WithdrawalRequestModel = await getWithdrawalRequestModel();
          const WalletTransactionModel = await getWalletTransactionModel();

          // Start atomic transaction
          session = await mongoose.startSession();
          session.startTransaction();

          // Find store and wallet
          const storeDoc = await StoreModel.findById(store.id).session(session);
          if (!storeDoc) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Store not found",
            });
          }

          const wallet = await WalletModel.findOne({ store: store.id }).session(
            session
          );
          if (!wallet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Wallet not found for this store",
            });
          }

          // Find selected payout account
          const payoutAccount = storeDoc.payoutAccounts.find(
            (acc) => acc.bankDetails.accountNumber === bankAccountId
          );
          if (!payoutAccount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Selected bank account not found or not verified",
            });
          }

          // Check available balance
          if (wallet.balance < amount) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Insufficient balance for withdrawal",
            });
          }

          // Calculate fees
          const PROCESSING_FEE_RATE = 0.015; // 1.5%
          const FIXED_FEE = 5000; // ₦50 in kobo
          const percentageFee = Math.round(amount * PROCESSING_FEE_RATE);
          const totalFee = percentageFee + FIXED_FEE;
          const netAmount = amount - totalFee;

          if (netAmount <= 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Withdrawal amount is too low after fees",
            });
          }

          // Generate unique request number
          const requestNumber = `WDR-${generateUniqueId(8).toUpperCase()}`;

          // Create withdrawal request
          const withdrawalRequest = new WithdrawalRequestModel({
            store: store.id,
            requestNumber,
            requestedAmount: amount,
            processingFee: totalFee,
            netAmount,
            bankDetails: {
              bankName: payoutAccount.bankDetails.bankName,
              accountNumber: payoutAccount.bankDetails.accountNumber,
              accountHolderName: payoutAccount.bankDetails.accountHolderName,
              bankCode: payoutAccount.bankDetails.bankCode,
            },
            status: "pending",
            statusHistory: [
              { status: "pending", notes: "Initial request created" },
            ],
            description,
          });
          await withdrawalRequest.save({ session });

          // Move funds from balance to pending
          wallet.balance = currencyOperations.subtract(wallet.balance, amount);
          wallet.pending = currencyOperations.add(wallet.pending, amount);
          await wallet.save({ session });

          // Create wallet transaction for debit
          const walletTransaction = new WalletTransactionModel({
            wallet: wallet._id,
            type: "debit",
            amount: amount,
            source: "withdrawal",
            description: `Withdrawal request ${requestNumber}`,
            relatedDocumentId: withdrawalRequest._id, // Link to withdrawal request
            relatedDocumentType: "WithdrawalRequest", // Specify type
          });
          await walletTransaction.save({ session });

          // Send confirmation email to store
          await sendMail({
            email: storeDoc.storeEmail,
            emailType: "noreply",
            fromAddress: "noreply@soraxihub.com",
            subject: `Withdrawal Request Received: ${requestNumber}`,
            html: wrapWithBrandedTemplate({
              title: "Withdrawal Request Received",
              bodyContent: `
              <h2>Withdrawal Request Received!</h2>
              <p>Dear ${storeDoc.name},</p>
              <p>We have received your withdrawal request for <strong>${formatNaira(
                amount
              )}</strong>.</p>
              <p>Your request number is: <strong>${requestNumber}</strong>.</p>
              <p>The net amount to be transferred to your account (${
                payoutAccount.bankDetails.bankName
              } - ${
                payoutAccount.bankDetails.accountNumber
              }) is <strong>${formatNaira(netAmount)}</strong>.</p>
              <p>Your request is currently <strong>pending</strong> review and typically takes 1-3 business days to process.</p>
              <p>We will notify you once the transfer is completed.</p>
              <p>Thank you for using ${siteConfig.name}!</p>
            `,
            }),
          });

          // Log audit action
          const auditDetails: WithdrawalAuditDetails = {
            action: "withdrawal_request_created",
            requestId: withdrawalRequest._id.toString(),
            requestNumber: withdrawalRequest.requestNumber,
            storeId: store.id,
            storeName: storeDoc.name,
            requestedAmount: amount,
            netAmount: netAmount,
            status: "pending",
            adminNotes: description,
          };
          await logAdminAction({
            adminId: store.id, // Using store ID as adminId for store-initiated actions
            adminName: storeDoc.name,
            adminEmail: storeDoc.storeEmail,
            adminRoles: ["store_owner" as Role], // Custom role for audit
            action: AUDIT_ACTIONS.PAYOUT_PROCESSED, // Closest action
            module: AUDIT_MODULES.FINANCE,
            details: auditDetails,
          });

          // Commit transaction
          await session.commitTransaction();

          return {
            success: true,
            message: "Withdrawal request submitted successfully",
            withdrawalRequest: {
              id: withdrawalRequest._id.toString(),
              requestNumber: withdrawalRequest.requestNumber,
              requestedAmount: withdrawalRequest.requestedAmount,
              netAmount: withdrawalRequest.netAmount,
              status: withdrawalRequest.status,
              createdAt: withdrawalRequest.createdAt.toISOString(),
            },
          };
        } catch (error) {
          // Rollback transaction on error
          if (session) {
            await session.abortTransaction();
          }
          console.error("Error creating withdrawal request:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to submit withdrawal request",
          });
        } finally {
          if (session) {
            await session.endSession();
          }
        }
      }
    ),

  /**
   * Admin-facing: Get a paginated list of withdrawal requests
   */
  getWithdrawalRequests: baseProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        status: z
          .enum([
            "pending",
            "under_review",
            "approved",
            "processing",
            "completed",
            "rejected",
            "failed",
          ])
          .optional(),
        storeId: z.string().optional(),
        search: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }): Promise<GetWithdrawalRequestsResponse> => {
      const { admin } = ctx;
      try {
        // Authenticate admin and check permission
        if (!admin || !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          });
        }

        const { page, limit, status, storeId, search, fromDate, toDate } =
          input;
        const skip = (page - 1) * limit;

        const WithdrawalRequestModel = await getWithdrawalRequestModel();
        // @ts-expect-error i am expecing an error in the line below because i am not using the models directly. I am using it inside the mongo unwind and lookups.
        const AdminModel = await getAdminModel(); // Assuming Admin model exists

        const pipeline: mongoose.PipelineStage[] = [];

        // Match by status
        if (status) {
          pipeline.push({ $match: { status } });
        }

        // Match by storeId
        if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
          pipeline.push({
            $match: { store: new mongoose.Types.ObjectId(storeId) },
          });
        }

        // Date range filter
        if (fromDate || toDate) {
          const dateFilter: Record<string, Date> = {};
          if (fromDate) dateFilter.$gte = new Date(fromDate);
          if (toDate) {
            const toDateObj = new Date(toDate);
            toDateObj.setHours(23, 59, 59, 999);
            dateFilter.$lte = toDateObj;
          }
          pipeline.push({ $match: { createdAt: dateFilter } });
        }

        // Populate store details for search and display
        pipeline.push({
          $lookup: {
            from: "stores",
            localField: "store",
            foreignField: "_id",
            as: "storeDetails",
            pipeline: [{ $project: { _id: 1, name: 1, storeEmail: 1 } }],
          },
        });
        pipeline.push({
          $addFields: { storeDetails: { $arrayElemAt: ["$storeDetails", 0] } },
        });

        // Search filter
        if (search && search.trim()) {
          pipeline.push({
            $match: {
              $or: [
                { requestNumber: { $regex: search.trim(), $options: "i" } },
                {
                  "storeDetails.name": { $regex: search.trim(), $options: "i" },
                },
                {
                  "bankDetails.accountHolderName": {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
              ],
            },
          });
        }

        // Sort by creation date
        pipeline.push({ $sort: { createdAt: -1 } });

        // Count total documents
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await WithdrawalRequestModel.aggregate(
          countPipeline
        );
        const totalRequests = countResult[0]?.total || 0;

        // Add pagination
        pipeline.push({ $skip: skip }, { $limit: limit });

        // Execute aggregation
        const requests = await WithdrawalRequestModel.aggregate(pipeline);

        // Format results
        const formattedRequests = requests.map((req) => ({
          id: req._id.toString(),
          requestNumber: req.requestNumber,
          store: {
            id: req.storeDetails._id.toString(),
            name: req.storeDetails.name,
            email: req.storeDetails.storeEmail,
          },
          requestedAmount: req.requestedAmount,
          netAmount: req.netAmount,
          status: req.status,
          createdAt: req.createdAt.toISOString(),
        }));

        // Calculate summary statistics
        const totalPending = await WithdrawalRequestModel.countDocuments({
          status: "pending",
        });
        const totalApprovedAmountResult =
          await WithdrawalRequestModel.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: null, total: { $sum: "$netAmount" } } },
          ]);
        const totalApprovedAmount = totalApprovedAmountResult[0]?.total || 0;

        // Log audit action
        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles as Role[],
          action: AUDIT_ACTIONS.VIEW_SETTLEMENTS, // Closest action
          module: AUDIT_MODULES.FINANCE,
          details: {
            viewType: "withdrawal_requests_list",
            filters: input,
            resultCount: formattedRequests.length,
            totalRequests,
          },
        });

        return {
          success: true,
          requests: formattedRequests,
          pagination: {
            page,
            limit,
            total: totalRequests,
            pages: Math.ceil(totalRequests / limit),
          },
          summary: {
            totalPending,
            totalApprovedAmount,
          },
        };
      } catch (error) {
        console.error("Error fetching withdrawal requests:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch withdrawal requests",
        });
      }
    }),

  /**
   * Admin-facing: Get detailed information about a single withdrawal request
   */
  getWithdrawalRequestDetail: baseProcedure
    .input(z.object({ requestId: z.string().min(1, "Request ID is required") }))
    .query(
      async ({
        input,
        ctx,
      }): Promise<{
        success: true;
        request: FormattedWithdrawalRequestDetail;
      }> => {
        const { admin } = ctx;
        try {
          // Authenticate admin and check permission
          if (
            !admin ||
            !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])
          ) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Admin authentication required",
            });
          }

          const { requestId } = input;
          if (!mongoose.Types.ObjectId.isValid(requestId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid request ID",
            });
          }

          const WithdrawalRequestModel = await getWithdrawalRequestModel();
          const AdminModel = await getAdminModel(); // Assuming Admin model exists
          // @ts-expect-error i am expecing an error in the line below because i am not using the models directly. I am using it inside the mongo unwind and lookups.
          const StoreModel = await getStoreModel();

          const pipeline: mongoose.PipelineStage[] = [
            { $match: { _id: new mongoose.Types.ObjectId(requestId) } },
            // Populate store details
            {
              $lookup: {
                from: "stores",
                localField: "store",
                foreignField: "_id",
                as: "storeDetails",
                pipeline: [
                  { $project: { _id: 1, name: 1, storeEmail: 1, wallet: 1 } },
                ],
              },
            },
            {
              $addFields: {
                storeDetails: { $arrayElemAt: ["$storeDetails", 0] },
              },
            },
            // Populate wallet balance for the store
            {
              $lookup: {
                from: "wallets",
                localField: "storeDetails.wallet",
                foreignField: "_id",
                as: "walletDetails",
                pipeline: [{ $project: { balance: 1 } }],
              },
            },
            {
              $addFields: {
                walletDetails: { $arrayElemAt: ["$walletDetails", 0] },
              },
            },
            // Populate reviewedBy admin
            {
              $lookup: {
                from: "admins",
                localField: "reviewedBy",
                foreignField: "_id",
                as: "reviewedByAdmin",
                pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
              },
            },
            {
              $addFields: {
                reviewedByAdmin: { $arrayElemAt: ["$reviewedByAdmin", 0] },
              },
            },
            // Populate processedBy admin
            {
              $lookup: {
                from: "admins",
                localField: "processedBy",
                foreignField: "_id",
                as: "processedByAdmin",
                pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
              },
            },
            {
              $addFields: {
                processedByAdmin: { $arrayElemAt: ["$processedByAdmin", 0] },
              },
            },
          ];

          const results: WithdrawalRequestDetailAggregationResult[] =
            await WithdrawalRequestModel.aggregate(pipeline);

          if (!results || results.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Withdrawal request not found",
            });
          }

          const request = results[0];

          // Format status history
          const formattedStatusHistory = await Promise.all(
            request.statusHistory.map(async (history) => {
              let adminName: string | undefined;
              if (history.adminId) {
                const adminDoc = await AdminModel.findById(history.adminId)
                  .select("name")
                  .lean();
                adminName = adminDoc?.name;
              }
              return {
                status: history.status,
                timestamp: history.timestamp.toISOString(),
                adminName,
                notes: history.notes,
              };
            })
          );

          const formattedRequest: FormattedWithdrawalRequestDetail = {
            id: request._id.toString(),
            requestNumber: request.requestNumber,
            store: {
              id: request.storeDetails._id.toString(),
              name: request.storeDetails.name,
              email: request.storeDetails.storeEmail,
              walletBalance: request.walletDetails?.balance || 0,
            },
            requestedAmount: request.requestedAmount,
            processingFee: request.processingFee,
            netAmount: request.netAmount,
            bankDetails: {
              bankName: request.bankDetails.bankName,
              accountNumber: request.bankDetails.accountNumber,
              accountHolderName: request.bankDetails.accountHolderName,
            },
            status: request.status,
            statusHistory: formattedStatusHistory,
            description: request.description,
            review: {
              reviewedBy: request.reviewedByAdmin
                ? {
                    id: request.reviewedByAdmin._id.toString(),
                    name: request.reviewedByAdmin.name,
                    email: request.reviewedByAdmin.email,
                  }
                : undefined,
              reviewedAt: request.reviewedAt?.toISOString(),
              notes: request.reviewNotes,
              rejectionReason: request.rejectionReason,
            },
            processing: {
              processedBy: request.processedByAdmin
                ? {
                    id: request.processedByAdmin._id.toString(),
                    name: request.processedByAdmin.name,
                    email: request.processedByAdmin.email,
                  }
                : undefined,
              processedAt: request.processedAt?.toISOString(),
              transactionReference: request.transactionReference,
            },
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
          };

          // Log audit action
          await logAdminAction({
            adminId: admin.id,
            adminName: admin.name,
            adminEmail: admin.email,
            adminRoles: admin.roles as Role[],
            action: AUDIT_ACTIONS.VIEW_SETTLEMENTS, // Closest action
            module: AUDIT_MODULES.FINANCE,
            details: {
              viewType: "withdrawal_request_detail",
              requestId: formattedRequest.id,
              requestNumber: formattedRequest.requestNumber,
              storeId: formattedRequest.store.id,
            },
          });

          return { success: true, request: formattedRequest };
        } catch (error) {
          console.error("Error fetching withdrawal request detail:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch withdrawal request details",
          });
        }
      }
    ),

  /**
   * Admin-facing: Approve a withdrawal request
   */
  approveWithdrawalRequest: baseProcedure
    .input(
      z.object({
        requestId: z.string().min(1, "Request ID is required"),
        transactionReference: z
          .string()
          .min(1, "Transaction reference is required"),
        notes: z.string().optional(),
      })
    )
    .mutation(
      async ({ input, ctx }): Promise<AdminWithdrawalActionResponse> => {
        const { admin } = ctx;
        let session: mongoose.ClientSession | null = null;

        try {
          // Authenticate admin and check permission
          if (
            !admin ||
            !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])
          ) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Admin authentication required",
            });
          }

          const {
            requestId,
            transactionReference,
            notes,
          }: ApproveWithdrawalRequestInput = input;
          if (!mongoose.Types.ObjectId.isValid(requestId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid request ID",
            });
          }

          const WithdrawalRequestModel = await getWithdrawalRequestModel();
          const WalletModel = await getWalletModel();
          // @ts-expect-error i am expecing an error in the line below because i am not using the models directly. I am using it inside the mongo unwind and lookups.
          const WalletTransactionModel = await getWalletTransactionModel();
          const StoreModel = await getStoreModel();

          session = await mongoose.startSession();
          session.startTransaction();

          // Find request and store
          const withdrawalRequest = await WithdrawalRequestModel.findById(
            requestId
          ).session(session);
          if (!withdrawalRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Withdrawal request not found",
            });
          }

          if (
            withdrawalRequest.status !== "pending" &&
            withdrawalRequest.status !== "under_review"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Withdrawal request is already ${withdrawalRequest.status}`,
            });
          }

          const wallet = await WalletModel.findOne({
            store: withdrawalRequest.store,
          }).session(session);
          if (!wallet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Store wallet not found",
            });
          }

          const storeDoc = await StoreModel.findById(
            withdrawalRequest.store
          ).session(session);
          if (!storeDoc) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Store not found",
            });
          }

          // Update request status
          withdrawalRequest.status = "approved";
          withdrawalRequest.reviewedBy = new mongoose.Types.ObjectId(admin.id);
          withdrawalRequest.reviewedAt = new Date();
          withdrawalRequest.reviewNotes = notes;
          withdrawalRequest.transactionReference = transactionReference;
          withdrawalRequest.statusHistory.push({
            status: "approved",
            timestamp: new Date(),
            adminId: new mongoose.Types.ObjectId(admin.id),
            notes: `Approved by admin. Ref: ${transactionReference}`,
          });
          await withdrawalRequest.save({ session });

          // Move funds from pending to processed (or directly debit if pending wasn't used)
          // Assuming funds were moved to 'pending' on request creation, now they are 'processed'
          wallet.pending = currencyOperations.subtract(
            wallet.pending,
            withdrawalRequest.requestedAmount
          );
          // No direct balance change here, as the actual transfer happens externally.
          // The balance was already debited when the request was created.
          // We might add a 'processed' transaction type or update the existing one.
          // For simplicity, we'll just update the request status and rely on external system for actual money movement.
          await wallet.save({ session });

          // Create a wallet transaction for the actual payout (if needed, or rely on external system)
          // For MVP, we'll assume this marks the completion of the internal process.
          // A 'debit' transaction was already created when the request was made.
          // We might add a 'processed' transaction type or update the existing one.
          // For simplicity, we'll just update the request status and rely on external system for actual money movement.

          // Send approval email to store
          await sendMail({
            email: storeDoc.storeEmail,
            emailType: "noreply",
            fromAddress: "noreply@soraxihub.com",
            subject: `Withdrawal Request Approved: ${withdrawalRequest.requestNumber}`,
            html: wrapWithBrandedTemplate({
              title: "Withdrawal Request Approved",
              bodyContent: `
              <h2>Your Withdrawal Request Has Been Approved!</h2>
              <p>Dear ${storeDoc.name},</p>
              <p>Your withdrawal request <strong>${
                withdrawalRequest.requestNumber
              }</strong> for <strong>${formatNaira(
                withdrawalRequest.requestedAmount
              )}</strong> has been approved.</p>
              <p>The net amount of <strong>${formatNaira(
                withdrawalRequest.netAmount
              )}</strong> has been processed to your bank account (${
                withdrawalRequest.bankDetails.bankName
              } - ${withdrawalRequest.bankDetails.accountNumber}).</p>
              <p>Transaction Reference: <strong>${transactionReference}</strong></p>
              <p>Funds should reflect in your account within 1-3 business days.</p>
              <p>Thank you for using ${siteConfig.name}!</p>
            `,
            }),
          });

          // Log audit action
          const auditDetails: WithdrawalAuditDetails = {
            action: "withdrawal_request_approved",
            requestId: withdrawalRequest._id.toString(),
            requestNumber: withdrawalRequest.requestNumber,
            storeId: withdrawalRequest.store.toString(),
            storeName: storeDoc.name,
            requestedAmount: withdrawalRequest.requestedAmount,
            netAmount: withdrawalRequest.netAmount,
            status: "approved",
            transactionReference,
            adminNotes: notes,
          };
          await logAdminAction({
            adminId: admin.id,
            adminName: admin.name,
            adminEmail: admin.email,
            adminRoles: admin.roles as Role[],
            action: AUDIT_ACTIONS.PAYOUT_PROCESSED,
            module: AUDIT_MODULES.FINANCE,
            details: auditDetails,
          });

          await session.commitTransaction();

          return {
            success: true,
            message: "Withdrawal request approved successfully",
            withdrawalRequest: {
              id: withdrawalRequest._id.toString(),
              requestNumber: withdrawalRequest.requestNumber,
              status: withdrawalRequest.status,
              updatedAt: withdrawalRequest.updatedAt.toISOString(),
            },
          };
        } catch (error) {
          if (session) {
            await session.abortTransaction();
          }
          console.error("Error approving withdrawal request:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to approve withdrawal request",
          });
        } finally {
          if (session) {
            await session.endSession();
          }
        }
      }
    ),

  /**
   * Admin-facing: Reject a withdrawal request
   */
  rejectWithdrawalRequest: baseProcedure
    .input(
      z.object({
        requestId: z.string().min(1, "Request ID is required"),
        reason: z.string().min(1, "Rejection reason is required"),
        notes: z.string().optional(),
      })
    )
    .mutation(
      async ({ input, ctx }): Promise<AdminWithdrawalActionResponse> => {
        const { admin } = ctx;
        let session: mongoose.ClientSession | null = null;

        try {
          // Authenticate admin and check permission
          if (
            !admin ||
            !checkAdminPermission(admin, [PERMISSIONS.VIEW_ESCROW])
          ) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Admin authentication required",
            });
          }

          const { requestId, reason, notes }: RejectWithdrawalRequestInput =
            input;
          if (!mongoose.Types.ObjectId.isValid(requestId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid request ID",
            });
          }

          const WithdrawalRequestModel = await getWithdrawalRequestModel();
          const WalletModel = await getWalletModel();
          const WalletTransactionModel = await getWalletTransactionModel();
          const StoreModel = await getStoreModel();

          session = await mongoose.startSession();
          session.startTransaction();

          // Find request and store
          const withdrawalRequest = await WithdrawalRequestModel.findById(
            requestId
          ).session(session);
          if (!withdrawalRequest) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Withdrawal request not found",
            });
          }

          if (
            withdrawalRequest.status !== "pending" &&
            withdrawalRequest.status !== "under_review"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Withdrawal request is already ${withdrawalRequest.status}`,
            });
          }

          const wallet = await WalletModel.findOne({
            store: withdrawalRequest.store,
          }).session(session);
          if (!wallet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Store wallet not found",
            });
          }

          const storeDoc = await StoreModel.findById(
            withdrawalRequest.store
          ).session(session);
          if (!storeDoc) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Store not found",
            });
          }

          // Update request status
          withdrawalRequest.status = "rejected";
          withdrawalRequest.reviewedBy = new mongoose.Types.ObjectId(admin.id);
          withdrawalRequest.reviewedAt = new Date();
          withdrawalRequest.reviewNotes = notes;
          withdrawalRequest.rejectionReason = reason;
          withdrawalRequest.statusHistory.push({
            status: "rejected",
            timestamp: new Date(),
            adminId: new mongoose.Types.ObjectId(admin.id),
            notes: `Rejected by admin. Reason: ${reason}`,
          });
          await withdrawalRequest.save({ session });

          // Return funds from pending back to balance
          wallet.pending = currencyOperations.subtract(
            wallet.pending,
            withdrawalRequest.requestedAmount
          );
          wallet.balance = currencyOperations.add(
            wallet.balance,
            withdrawalRequest.requestedAmount
          );
          await wallet.save({ session });

          // Create wallet transaction for refund/adjustment
          const walletTransaction = new WalletTransactionModel({
            wallet: wallet._id,
            type: "credit",
            amount: withdrawalRequest.requestedAmount,
            source: "adjustment", // Or 'refund' if applicable
            description: `Withdrawal request ${withdrawalRequest.requestNumber} rejected. Funds returned.`,
            relatedDocumentId: withdrawalRequest._id, // Link to withdrawal request
            relatedDocumentType: "WithdrawalRequest", // Specify type
          });
          await walletTransaction.save({ session });

          // Send rejection email to store
          await sendMail({
            email: storeDoc.storeEmail,
            emailType: "noreply",
            fromAddress: "noreply@soraxihub.com",
            subject: `Withdrawal Request Rejected: ${withdrawalRequest.requestNumber}`,
            html: wrapWithBrandedTemplate({
              title: "Withdrawal Request Rejected",
              bodyContent: `
              <h2>Your Withdrawal Request Has Been Rejected</h2>
              <p>Dear ${storeDoc.name},</p>
              <p>Your withdrawal request <strong>${
                withdrawalRequest.requestNumber
              }</strong> for <strong>${formatNaira(
                withdrawalRequest.requestedAmount
              )}</strong> has been rejected.</p>
              <p>Reason: <strong>${reason}</strong></p>
              <p>The requested amount of <strong>${formatNaira(
                withdrawalRequest.requestedAmount
              )}</strong> has been returned to your available wallet balance.</p>
              <p>Please review the reason and submit a new request if applicable.</p>
              <p>Thank you for using ${siteConfig.name}!</p>
            `,
            }),
          });

          // Log audit action
          const auditDetails: WithdrawalAuditDetails = {
            action: "withdrawal_request_rejected",
            requestId: withdrawalRequest._id.toString(),
            requestNumber: withdrawalRequest.requestNumber,
            storeId: withdrawalRequest.store.toString(),
            storeName: storeDoc.name,
            requestedAmount: withdrawalRequest.requestedAmount,
            netAmount: withdrawalRequest.netAmount,
            status: "rejected",
            rejectionReason: reason,
            adminNotes: notes,
          };
          await logAdminAction({
            adminId: admin.id,
            adminName: admin.name,
            adminEmail: admin.email,
            adminRoles: admin.roles as Role[],
            action: AUDIT_ACTIONS.PAYOUT_REJECTED,
            module: AUDIT_MODULES.FINANCE,
            details: auditDetails,
          });

          await session.commitTransaction();

          return {
            success: true,
            message: "Withdrawal request rejected successfully",
            withdrawalRequest: {
              id: withdrawalRequest._id.toString(),
              requestNumber: withdrawalRequest.requestNumber,
              status: withdrawalRequest.status,
              updatedAt: withdrawalRequest.updatedAt.toISOString(),
            },
          };
        } catch (error) {
          if (session) {
            await session.abortTransaction();
          }
          console.error("Error rejecting withdrawal request:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to reject withdrawal request",
          });
        } finally {
          if (session) {
            await session.endSession();
          }
        }
      }
    ),

  /**
   * Store-facing: Get detailed information about a single withdrawal request for the store owner.
   * Ensures the request belongs to the authenticated store.
   */
  getStoreWithdrawalRequestDetail: baseProcedure
    .input(
      z.object({
        storeId: z.string().min(1, "Store ID is required"),
        requestId: z.string().min(1, "Request ID is required"),
      })
    )
    .query(
      async ({
        input,
        ctx,
      }): Promise<{
        success: true;
        request: FormattedStoreWithdrawalRequestDetail;
      }> => {
        const { store } = ctx;
        try {
          // Authenticate store
          if (!store?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Store authentication required",
            });
          }

          const { storeId, requestId } = input;

          // Ensure the authenticated store matches the requested storeId
          if (store.id !== storeId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied to this store's withdrawal requests",
            });
          }

          if (!mongoose.Types.ObjectId.isValid(requestId)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid request ID",
            });
          }

          const WithdrawalRequestModel = await getWithdrawalRequestModel();
          // @ts-expect-error i am expecing an error in the line below because i am not using the models directly. I am using it inside the mongo unwind and lookups.
          const WalletModel = await getWalletModel();
          // @ts-expect-error i am expecing an error in the line below because i am not using the models directly. I am using it inside the mongo unwind and lookups.
          const AdminModel = await getAdminModel(); // Needed to get admin names for status history

          const pipeline: mongoose.PipelineStage[] = [
            {
              $match: {
                _id: new mongoose.Types.ObjectId(requestId),
                store: new mongoose.Types.ObjectId(storeId),
              },
            },
            // Populate store details (essential for wallet balance)
            {
              $lookup: {
                from: "stores",
                localField: "store",
                foreignField: "_id",
                as: "storeDetails",
                pipeline: [
                  { $project: { _id: 1, name: 1, storeEmail: 1, wallet: 1 } },
                ],
              },
            },
            {
              $addFields: {
                storeDetails: { $arrayElemAt: ["$storeDetails", 0] },
              },
            },
            // Populate wallet balance for the store
            {
              $lookup: {
                from: "wallets",
                localField: "storeDetails.wallet",
                foreignField: "_id",
                as: "walletDetails",
                pipeline: [{ $project: { balance: 1 } }],
              },
            },
            {
              $addFields: {
                walletDetails: { $arrayElemAt: ["$walletDetails", 0] },
              },
            },
          ];

          const results: WithdrawalRequestDetailAggregationResult[] =
            await WithdrawalRequestModel.aggregate(pipeline);

          if (!results || results.length === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Withdrawal request not found or does not belong to this store",
            });
          }

          const request = results[0];

          // Format status history (without adminName for store view)
          const formattedStatusHistory = await Promise.all(
            request.statusHistory.map(async (history) => {
              return {
                status: history.status,
                timestamp: history.timestamp.toISOString(),
                notes: history.notes,
              };
            })
          );

          const formattedRequest: FormattedStoreWithdrawalRequestDetail = {
            id: request._id.toString(),
            requestNumber: request.requestNumber,
            store: {
              id: request.storeDetails._id.toString(),
              name: request.storeDetails.name,
              email: request.storeDetails.storeEmail,
              walletBalance: request.walletDetails?.balance || 0,
            },
            requestedAmount: request.requestedAmount,
            processingFee: request.processingFee,
            netAmount: request.netAmount,
            bankDetails: {
              bankName: request.bankDetails.bankName,
              accountNumber: request.bankDetails.accountNumber,
              accountHolderName: request.bankDetails.accountHolderName,
            },
            status: request.status,
            statusHistory: formattedStatusHistory,
            description: request.description,
            review: {
              reviewedAt: request.reviewedAt?.toISOString(),
              notes: request.reviewNotes,
              rejectionReason: request.rejectionReason,
            },
            processing: {
              processedAt: request.processedAt?.toISOString(),
              transactionReference: request.transactionReference,
            },
            createdAt: request.createdAt.toISOString(),
            updatedAt: request.updatedAt.toISOString(),
          };

          return { success: true, request: formattedRequest };
        } catch (error) {
          console.error(
            "Error fetching store withdrawal request detail:",
            error
          );
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch withdrawal request details",
          });
        }
      }
    ),
});

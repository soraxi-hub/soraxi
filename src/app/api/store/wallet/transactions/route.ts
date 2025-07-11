import { type NextRequest, NextResponse } from "next/server";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

/**
 * Store Wallet Transactions API Route
 *
 * Handles wallet transaction retrieval with advanced filtering,
 * pagination, and search capabilities for authenticated stores.
 *
 * Features:
 * - Advanced filtering by type, source, and date range
 * - Full-text search across transaction descriptions
 * - Pagination with configurable page sizes
 * - Comprehensive transaction data with related order information
 * - Performance-optimized MongoDB aggregation queries
 */

/**
 * GET /api/store/wallet/transactions
 *
 * Retrieves paginated wallet transactions with filtering options.
 * Supports filtering by type, source, date range, and search terms.
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 * - type: Transaction type filter (credit|debit)
 * - source: Transaction source filter (order|withdrawal|refund|adjustment)
 * - days: Date range filter in days (7|30|90|365)
 * - search: Search term for descriptions
 *
 * @param request - Next.js request object with query parameters
 * @returns Paginated transaction data or error response
 */
export async function GET(request: NextRequest) {
  try {
    // Validate store session
    const storeSession = await getStoreFromCookie();
    if (!storeSession?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Store session required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "10"))
    );
    const type = searchParams.get("type");
    const source = searchParams.get("source");
    const days = searchParams.get("days");
    const search = searchParams.get("search");

    // Get models
    const Wallet = await getWalletModel();
    const WalletTransaction = await getWalletTransactionModel();

    // Find store's wallet
    const wallet = await Wallet.findOne({ store: storeSession.id }).select(
      "_id"
    );
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found for this store" },
        { status: 404 }
      );
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match transactions for this wallet
      { $match: { wallet: wallet._id } },
    ];

    // Add type filter
    if (type && ["credit", "debit"].includes(type)) {
      pipeline.push({ $match: { type } });
    }

    // Add source filter
    if (
      source &&
      ["order", "withdrawal", "refund", "adjustment"].includes(source)
    ) {
      pipeline.push({ $match: { source } });
    }

    // Add date range filter
    if (days && !isNaN(Number.parseInt(days))) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number.parseInt(days));
      pipeline.push({
        $match: {
          createdAt: { $gte: daysAgo },
        },
      });
    }

    // Add search filter
    if (search && search.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { description: { $regex: search.trim(), $options: "i" } },
            { source: { $regex: search.trim(), $options: "i" } },
          ],
        },
      });
    }

    // Add sorting
    pipeline.push({ $sort: { createdAt: -1 } });

    // Execute aggregation for total count
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await WalletTransaction.aggregate(countPipeline);
    const totalTransactions = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });

    // Add population for related order data
    pipeline.push(
      {
        $lookup: {
          from: "orders",
          localField: "relatedOrderId",
          foreignField: "_id",
          as: "relatedOrder",
          pipeline: [
            {
              $project: {
                _id: 1,
                totalAmount: 1,
                createdAt: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          relatedOrder: { $arrayElemAt: ["$relatedOrder", 0] },
        },
      }
    );

    // Execute main aggregation
    const transactions = await WalletTransaction.aggregate(pipeline);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalTransactions / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format transactions for client
    const formattedTransactions = transactions.map((transaction) => ({
      _id: transaction._id.toString(),
      wallet: transaction.wallet.toString(),
      type: transaction.type,
      amount: transaction.amount,
      source: transaction.source,
      description: transaction.description || null,
      relatedOrderId: transaction.relatedOrderId?.toString() || null,
      relatedOrder: transaction.relatedOrder
        ? {
            _id: transaction.relatedOrder._id.toString(),
            totalAmount: transaction.relatedOrder.totalAmount,
            createdAt: transaction.relatedOrder.createdAt,
          }
        : null,
      createdAt: transaction.createdAt,
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        pageSize: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/store/wallet/transactions
 *
 * Creates a new wallet transaction (for manual adjustments by admins).
 * This endpoint is typically used for administrative purposes.
 *
 * @param request - Next.js request object with transaction data
 * @returns Created transaction data or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Validate store session
    const storeSession = await getStoreFromCookie();
    if (!storeSession?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Store session required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { type, amount, source, description, relatedOrderId } = body;

    // Validate required fields
    if (!type || !amount || !source) {
      return NextResponse.json(
        { error: "Missing required fields: type, amount, source" },
        { status: 400 }
      );
    }

    // Validate field values
    if (!["credit", "debit"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    if (!["order", "withdrawal", "refund", "adjustment"].includes(source)) {
      return NextResponse.json(
        { error: "Invalid transaction source" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Get models
    const Wallet = await getWalletModel();
    const WalletTransaction = await getWalletTransactionModel();

    // Find store's wallet
    const wallet = await Wallet.findOne({ store: storeSession.id });
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found for this store" },
        { status: 404 }
      );
    }

    // Create transaction
    const transaction = new WalletTransaction({
      wallet: wallet._id,
      type,
      amount,
      source,
      description,
      relatedOrderId: relatedOrderId || undefined,
    });

    const savedTransaction = await transaction.save();

    // Update wallet balance
    if (type === "credit") {
      wallet.balance += amount;
      wallet.totalEarned += amount;
    } else {
      wallet.balance -= amount;
    }

    await wallet.save();

    return NextResponse.json(
      {
        success: true,
        message: "Transaction created successfully",
        transaction: {
          _id: savedTransaction._id.toString(),
          wallet: savedTransaction.wallet.toString(),
          type: savedTransaction.type,
          amount: savedTransaction.amount,
          source: savedTransaction.source,
          description: savedTransaction.description,
          relatedOrderId: savedTransaction.relatedOrderId?.toString(),
          createdAt: savedTransaction.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating wallet transaction:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

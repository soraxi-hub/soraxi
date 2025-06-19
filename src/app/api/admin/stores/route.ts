import { type NextRequest, NextResponse } from "next/server"
import { getStoreModel } from "@/lib/db/models/store.model"

/**
 * API Route: Admin Store Management
 * Handles listing and filtering stores for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin authentication check here
    // const admin = getAdminFromRequest(request)
    // if (!admin || !checkAdminPermission(admin, ["view_stores"])) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const verified = searchParams.get("verified")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const Store = await getStoreModel()

    // Build query
    const query: any = {}

    if (status && status !== "all") {
      query.status = status
    }

    if (verified && verified !== "all") {
      query["verification.isVerified"] = verified === "true"
    }

    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { storeEmail: { $regex: search, $options: "i" } }]
    }

    // Get stores with pagination
    const stores = await Store.find(query)
      .select("name storeEmail status verification businessInfo createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Get total count for pagination
    const total = await Store.countDocuments(query)

    // Transform data for frontend
    const transformedStores = stores.map((store: any) => ({
      id: store._id.toString(),
      name: store.name,
      storeEmail: store.storeEmail,
      status: store.status,
      verification: store.verification,
      businessInfo: store.businessInfo,
      stats: {
        totalProducts: 0, // TODO: Calculate from products collection
        totalOrders: 0, // TODO: Calculate from orders collection
        totalRevenue: 0, // TODO: Calculate from orders collection
        averageRating: 0, // TODO: Calculate from reviews collection
      },
      createdAt: store.createdAt,
      lastActivity: store.updatedAt,
      notes: [], // TODO: Fetch from notes collection
    }))

    // Log admin action
    // await logAdminAction({
    //   adminId: admin.id,
    //   adminName: admin.name,
    //   adminEmail: admin.email,
    //   adminRoles: admin.roles,
    //   action: "Viewed stores list",
    //   module: AUDIT_MODULES.STORES,
    //   details: { filters: { status, verified, search }, page, limit },
    //   ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    //   userAgent: request.headers.get("user-agent") || "unknown",
    // })

    return NextResponse.json({
      success: true,
      stores: transformedStores,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

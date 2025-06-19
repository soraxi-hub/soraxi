import { NextResponse } from "next/server"
import { getProductModel } from "@/lib/db/models/product.model"

/**
 * API Route: Categories
 * Returns product categories with counts
 */
export async function GET() {
  try {
    const Product = await getProductModel()

    // Get category counts using aggregation
    const categoryStats = await Product.aggregate([
      { $match: { isVerifiedProduct: true, isVisible: true } },
      { $unwind: "$category" },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Map categories with icons (you can customize these)
    const categoryIcons: Record<string, string> = {
      Electronics: "📱",
      "Clothing & Fashion": "👕",
      "Home & Garden": "🏠",
      "Sports & Outdoors": "⚽",
      "Books & Media": "📚",
      "Health & Beauty": "💄",
      "Toys & Games": "🎮",
      Automotive: "🚗",
      "Food & Beverages": "🍕",
      "Art & Crafts": "🎨",
    }

    const categories = categoryStats.map((stat) => ({
      name: stat._id,
      count: stat.count,
      icon: categoryIcons[stat._id] || "📦",
      image: `/placeholder.svg?height=100&width=100`,
    }))

    return NextResponse.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

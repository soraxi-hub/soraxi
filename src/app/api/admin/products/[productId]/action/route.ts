import { type NextRequest, NextResponse } from "next/server";
import { getProductModel, IProduct } from "@/lib/db/models/product.model";
// import { AUDIT_ACTIONS } from "@/lib/admin/audit-logger";

/**
 * API Route: Product Actions
 * Handles approve, reject, unpublish, delete actions on products
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    // TODO: Add admin authentication check here
    // const admin = getAdminFromRequest(request)
    // if (!admin || !checkAdminPermission(admin, ["verify_product", "delete_product"])) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const { productId } = await params;
    const body = await request.json();
    const { action } = body;
    // const { action, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const Product = await getProductModel();
    const product = (await Product.findById(productId)) as IProduct | null;

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const updateData: any = {};
    const auditAction = "";
    const message = "";

    // switch (action) {
    //   case "approve":
    //     if (product.status !== "pending") {
    //       return NextResponse.json(
    //         { error: "Product is not pending approval" },
    //         { status: 400 }
    //       );
    //     }
    //     updateData = {
    //       status: "active",
    //       moderationNotes: reason || "Approved by admin",
    //     };
    //     auditAction = AUDIT_ACTIONS.PRODUCT_APPROVED;
    //     message = "Product approved successfully";
    //     break;

    //   case "reject":
    //     if (product.status !== "pending") {
    //       return NextResponse.json(
    //         { error: "Product is not pending approval" },
    //         { status: 400 }
    //       );
    //     }
    //     updateData = {
    //       status: "rejected",
    //       moderationNotes: reason || "Rejected by admin",
    //     };
    //     auditAction = AUDIT_ACTIONS.PRODUCT_REJECTED;
    //     message = "Product rejected";
    //     break;

    //   case "unpublish":
    //     if (product.status !== "active") {
    //       return NextResponse.json(
    //         { error: "Product is not active" },
    //         { status: 400 }
    //       );
    //     }
    //     updateData = {
    //       status: "unpublished",
    //       moderationNotes: reason || "Unpublished by admin",
    //     };
    //     auditAction = AUDIT_ACTIONS.PRODUCT_UNPUBLISHED;
    //     message = "Product unpublished";
    //     break;

    //   case "delete":
    //     await Product.findByIdAndDelete(productId);
    //     auditAction = AUDIT_ACTIONS.PRODUCT_DELETED;
    //     message = "Product deleted";
    //     break;

    //   default:
    //     return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    // }

    // Update product (if not deleted)
    if (action !== "delete") {
      await Product.findByIdAndUpdate(productId, updateData);
    }

    // Log admin action
    // await logAdminAction({
    //   adminId: admin.id,
    //   adminName: admin.name,
    //   adminEmail: admin.email,
    //   adminRoles: admin.roles,
    //   action: auditAction,
    //   module: AUDIT_MODULES.PRODUCTS,
    //   resourceId: productId,
    //   resourceType: "product",
    //   details: { action, reason, previousStatus: product.status },
    //   ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    //   userAgent: request.headers.get("user-agent") || "unknown",
    // })

    console.log(auditAction);

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error performing product action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

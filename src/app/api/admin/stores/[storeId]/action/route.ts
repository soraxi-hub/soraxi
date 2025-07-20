import { type NextRequest, NextResponse } from "next/server";
import { getStoreModel } from "@/lib/db/models/store.model";
import { AUDIT_ACTIONS } from "@/lib/admin/audit-logger";

/**
 * API Route: Store Actions
 * Handles approve, reject, suspend, reactivate actions on stores
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    // TODO: Add admin authentication check here
    // const admin = getAdminFromRequest(request)
    // if (!admin || !checkAdminPermission(admin, ["verify_store", "suspend_store"])) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const { storeId } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const Store = await getStoreModel();
    const store = await Store.findById(storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    let updateData = {};
    let auditAction = "";
    let message = "";

    switch (action) {
      case "approve":
        if (store.status !== "pending") {
          return NextResponse.json(
            { error: "Store is not pending approval" },
            { status: 400 }
          );
        }
        updateData = {
          status: "active",
          "verification.isVerified": true,
          "verification.verifiedAt": new Date(),
          "verification.notes": reason || "Approved by admin",
        };
        auditAction = AUDIT_ACTIONS.STORE_APPROVED;
        message = "Store approved successfully";
        break;

      case "reject":
        if (store.status !== "pending") {
          return NextResponse.json(
            { error: "Store is not pending approval" },
            { status: 400 }
          );
        }
        updateData = {
          status: "rejected",
          "verification.isVerified": false,
          "verification.notes": reason || "Rejected by admin",
        };
        auditAction = AUDIT_ACTIONS.STORE_REJECTED;
        message = "Store rejected";
        break;

      case "suspend":
        if (store.status !== "active") {
          return NextResponse.json(
            { error: "Store is not active" },
            { status: 400 }
          );
        }
        updateData = {
          status: "suspended",
          "verification.notes": reason || "Suspended by admin",
        };
        auditAction = AUDIT_ACTIONS.STORE_SUSPENDED;
        message = "Store suspended";
        break;

      case "reactivate":
        if (store.status !== "suspended") {
          return NextResponse.json(
            { error: "Store is not suspended" },
            { status: 400 }
          );
        }
        updateData = {
          status: "active",
          "verification.notes": reason || "Reactivated by admin",
        };
        auditAction = AUDIT_ACTIONS.STORE_REACTIVATED;
        message = "Store reactivated";
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update store
    await Store.findByIdAndUpdate(storeId, updateData);
    console.log("auditAction", auditAction); // i want tobypass this: Type error: 'auditAction' is declared but its value is never read.
    console.log("message", message); // i want tobypass this: Type error: 'auditAction' is declared but its value is never read.

    // Log admin action
    // await logAdminAction({
    //   adminId: admin.id,
    //   adminName: admin.name,
    //   adminEmail: admin.email,
    //   adminRoles: admin.roles,
    //   action: auditAction,
    //   module: AUDIT_MODULES.STORES,
    //   resourceId: storeId,
    //   resourceType: "store",
    //   details: { action, reason, previousStatus: store.status },
    //   ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    //   userAgent: request.headers.get("user-agent") || "unknown",
    // })

    // TODO: Send notification email to store owner

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Error performing store action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

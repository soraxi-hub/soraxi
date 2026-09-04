import type { Metadata } from "next";
import { CouponManagement } from "@/modules/admin/coupons/coupon-management";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Create, edit, and monitor discount coupons.",
};

export default function AdminCouponsPage() {
  return <CouponManagement />;
}

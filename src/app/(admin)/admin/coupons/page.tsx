import { CouponManagement } from "@/modules/admin/coupons/coupon-management";

export const dynamic = "force-dynamic";

/**
 * Admin Coupons Page
 * Coupon management interface for administrators
 */
export default function AdminCouponsPage() {
  return <CouponManagement />;
}

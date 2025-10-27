import type { CouponType } from "@/validators/coupon-validations";

/**
 * Coupon Admin Manager Class
 * Handles coupon administration operations using OOP principles
 */
export class CouponAdminManager {
  private couponData: CouponType | null;

  constructor(couponData: CouponType | null = null) {
    this.couponData = couponData;
  }

  /**
   * Get coupon analytics and statistics
   */
  getCouponAnalytics() {
    if (!this.couponData) return null;

    return {
      code: this.couponData.code,
      type: this.couponData.type,
      value: this.couponData.value,
      isActive: this.couponData.isActive,
      maxRedemptions: this.couponData.maxRedemptions,
      startDate: this.couponData.startDate,
      endDate: this.couponData.endDate,
      minOrderValue: this.couponData.minOrderValue,
      stackable: this.couponData.stackable,
      applicableProducts: this.couponData.productIds?.length || 0,
      applicableStores: this.couponData.storeIds?.length || 0,
      isExpired: this.isExpired(),
      daysRemaining: this.getDaysRemaining(),
    };
  }

  /**
   * Check if coupon is currently valid
   */
  isValid(): boolean {
    if (!this.couponData) return false;
    const now = new Date();
    return (
      this.couponData.isActive &&
      now >= this.couponData.startDate &&
      now <= this.couponData.endDate
    );
  }

  /**
   * Check if coupon has expired
   */
  isExpired(): boolean {
    if (!this.couponData) return false;
    return new Date() > this.couponData.endDate;
  }

  /**
   * Get days remaining until expiration
   */
  getDaysRemaining(): number {
    if (!this.couponData) return 0;
    const now = new Date();
    const diff = this.couponData.endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get coupon status badge info
   */
  getStatusBadge(): { label: string; variant: string } {
    if (!this.couponData) return { label: "Unknown", variant: "secondary" };

    if (this.isExpired()) {
      return { label: "Expired", variant: "destructive" };
    }
    if (!this.couponData.isActive) {
      return { label: "Inactive", variant: "secondary" };
    }
    return { label: "Active", variant: "success" };
  }

  /**
   * Format coupon discount display
   */
  formatDiscount(): string {
    if (!this.couponData) return "";
    if (this.couponData.type === "percentage") {
      return `${this.couponData.value}%`;
    }
    return `₦${this.couponData.value}`;
  }

  /**
   * Get coupon scope information
   */
  getScope(): { type: string; description: string } {
    if (!this.couponData) return { type: "unknown", description: "" };

    if (this.couponData.userId) {
      return { type: "user", description: "Specific user only" };
    }
    if (this.couponData.productIds?.length > 0) {
      return {
        type: "products",
        description: `${this.couponData.productIds.length} product(s)`,
      };
    }
    if (this.couponData.storeIds?.length > 0) {
      return {
        type: "stores",
        description: `${this.couponData.storeIds.length} store(s)`,
      };
    }
    return { type: "global", description: "All products and stores" };
  }
}

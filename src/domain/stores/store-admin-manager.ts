import type { StoreDataProfileAdminView } from "@/modules/admin/stores/store-admin-dashboard";
import {
  StoreBusinessInfoEnum,
  StoreStatusEnum,
} from "@/validators/store-validators";

/**
 * Store Admin Manager Class
 * Handles all store administration operations using OOP principles
 */
export class StoreAdminManager {
  private storeData: StoreDataProfileAdminView;

  constructor(storeData: StoreDataProfileAdminView) {
    this.storeData = storeData;
  }

  /**
   * Get comprehensive store analytics
   */
  getStoreAnalytics() {
    return {
      totalProducts: this.storeData.products?.length || 0,
      totalFollowers: this.storeData.followers?.length || 0,
      averageRating: this.storeData.ratings?.averageRating || 0,
      reviewCount: this.storeData.ratings?.reviewCount || 0,
      complaintCount: this.storeData.ratings?.complaintCount || 0,
      isVerified: this.storeData.verification?.isVerified || false,
      businessType: this.storeData.businessInfo?.type || "unknown",
      accountAge: this.calculateAccountAge(),
      lastActivity: this.storeData.updatedAt,
    };
  }

  /**
   * Get a store's business type. Individual || Company
   */
  getBusinessType() {
    return (
      this.storeData.businessInfo?.type || StoreBusinessInfoEnum.Individual
    );
  }

  /**
   * Get available admin actions based on store status
   */
  getAvailableActions(): AdminAction[] {
    const actions: AdminAction[] = [];
    const status = this.storeData.status;

    switch (status) {
      case StoreStatusEnum.Pending:
        actions.push(
          {
            type: "approved",
            label: "Approve Store",
            variant: "success",
            icon: "CheckCircle",
          },
          {
            type: "rejected",
            label: "Reject Store",
            variant: "destructive",
            icon: "XCircle",
          }
        );
        break;
      case StoreStatusEnum.Active:
        actions.push({
          type: "suspend",
          label: "Suspend Store",
          variant: "destructive",
          icon: "Pause",
        });
        break;
      case StoreStatusEnum.Suspended:
        actions.push({
          type: "reactivate",
          label: "Reactivate Store",
          variant: "success",
          icon: "Play",
        });
        break;
      case StoreStatusEnum.Rejected:
        actions.push({
          type: "approved",
          label: "Approve Store",
          variant: "success",
          icon: "CheckCircle",
        });
        break;
    }

    return actions;
  }

  /**
   * Get store risk assessment
   */
  getRiskAssessment(): RiskAssessment {
    let riskScore = 0;
    const factors: string[] = [];

    // Check complaint ratio
    const complaintRatio =
      (this.storeData.ratings?.complaintCount ?? 0) /
      Math.max(this.storeData.ratings?.reviewCount ?? 0, 1);
    if (complaintRatio > 0.3) {
      riskScore += 30;
      factors.push("High complaint ratio");
    }

    // Check verification status
    if (!this.storeData.verification?.isVerified) {
      riskScore += 20;
      factors.push("Unverified store");
    }

    // Check business info completeness
    if (!this.storeData.businessInfo?.businessName) {
      riskScore += 15;
      factors.push("Incomplete business information");
    }

    // Check account age
    const accountAge = this.calculateAccountAge();
    if (accountAge < 30) {
      riskScore += 25;
      factors.push("New account (less than 30 days)");
    }

    // Check product count
    if (this.storeData.products?.length === 0) {
      riskScore += 10;
      factors.push("No products listed");
    }

    return {
      score: Math.min(riskScore, 100),
      level: this.getRiskLevel(riskScore),
      factors,
    };
  }

  /**
   * Get store compliance status
   */
  getComplianceStatus(): ComplianceStatus {
    const checks: ComplianceCheck[] = [
      {
        name: "Business Information",
        status: this.storeData.businessInfo?.businessName ? "passed" : "failed",
        description: "Complete business registration details",
      },
      {
        name: "Email Verification",
        status: this.storeData.verification?.isVerified ? "passed" : "failed",
        description: "Email address verified",
      },
      {
        name: "Terms Agreement",
        status: this.storeData.agreedToTermsAt ? "passed" : "failed",
        description: "Agreed to platform terms",
      },
      {
        name: "Payout Setup",
        status:
          this.storeData.payoutAccounts?.length > 0 ? "passed" : "warning",
        description: "Payment method configured",
      },
      {
        name: "Shipping Methods",
        status:
          this.storeData.shippingMethods?.length > 0 ? "passed" : "warning",
        description: "Shipping options configured",
      },
    ];

    const passedChecks = checks.filter(
      (check) => check.status === "passed"
    ).length;
    const totalChecks = checks.length;
    const complianceScore = Math.round((passedChecks / totalChecks) * 100);

    return {
      score: complianceScore,
      checks,
      level:
        complianceScore >= 80
          ? "high"
          : complianceScore >= 60
          ? "medium"
          : "low",
    };
  }

  /**
   * Generate admin action summary
   */
  getActionSummary(): ActionSummary {
    const analytics = this.getStoreAnalytics();
    const risk = this.getRiskAssessment();
    const compliance = this.getComplianceStatus();

    return {
      recommendedAction: this.getRecommendedAction(risk, compliance),
      priority: this.getActionPriority(risk, compliance),
      analytics,
      risk,
      compliance,
    };
  }

  private calculateAccountAge(): number {
    const createdAt = new Date(this.storeData.createdAt);
    const now = new Date();
    return Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  private getRiskLevel(score: number): "low" | "medium" | "high" {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  }

  private getRecommendedAction(
    risk: RiskAssessment,
    compliance: ComplianceStatus
  ): string {
    if (risk.level === "high") {
      return "Requires immediate review - High risk factors detected";
    }
    if (compliance.level === "low") {
      return "Request compliance improvements before approval";
    }
    if (
      this.storeData.status === StoreStatusEnum.Pending &&
      compliance.level === "high"
    ) {
      return "Ready for approval - All compliance checks passed";
    }
    return "Monitor store activity - No immediate action required";
  }

  private getActionPriority(
    risk: RiskAssessment,
    compliance: ComplianceStatus
  ): "low" | "medium" | "high" {
    if (risk.level === "high") return "high";
    if (compliance.level === "low") return "medium";
    return "low";
  }
}

// Type definitions
export interface AdminAction {
  type:
    | "approved"
    | "rejected"
    | "reactivate"
    | "suspend"
    | "view_details"
    | "contact_owner"
    | "audit_log"
    | "verify";
  label: string;
  variant:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "success";
  icon: string;
}

export interface RiskAssessment {
  score: number;
  level: "low" | "medium" | "high";
  factors: string[];
}

export interface ComplianceCheck {
  name: string;
  status: "passed" | "failed" | "warning";
  description: string;
}

export interface ComplianceStatus {
  score: number;
  checks: ComplianceCheck[];
  level: "low" | "medium" | "high";
}

export interface ActionSummary {
  recommendedAction: string;
  priority: "low" | "medium" | "high";
  analytics: any;
  risk: RiskAssessment;
  compliance: ComplianceStatus;
}

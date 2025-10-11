import { ProductStatusEnum } from "@/validators/product-validators";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";

type Product = inferProcedureOutput<AppRouter["admin"]["getById"]>;

/**
 * Product Admin Manager Class
 * Handles all product administration operations using OOP principles
 */
export class ProductAdminManager {
  private productData: Product;
  // private adminUser: any;

  constructor(productData: Product) {
    this.productData = productData;
    // this.adminUser = adminUser;
  }

  /**
   * Get comprehensive product analytics
   */
  getProductAnalytics() {
    return {
      status: this.productData.status,
      isVerified: this.productData.isVerifiedProduct || false,
      category: this.productData.category,
      price: this.productData.price,
      imageCount: this.productData.images?.length || 0,
      hasDescription: !!this.productData.description,
      accountAge: this.calculateProductAge(),
      lastActivity: this.productData.updatedAt,
      firstApprovedAt: this.productData.firstApprovedAt,
    };
  }

  /**
   * Get available admin actions based on product status
   */
  getAvailableActions(): AdminAction[] {
    const actions: AdminAction[] = [];
    const status = this.productData.status;

    switch (status) {
      case ProductStatusEnum.Pending:
        actions.push(
          {
            type: "approve",
            label: "Approve Product",
            variant: "success",
            icon: "CheckCircle",
          },
          {
            type: "reject",
            label: "Reject Product",
            variant: "destructive",
            icon: "XCircle",
          }
        );
        break;
      case ProductStatusEnum.Approved:
        actions.push({
          type: "reject",
          label: "Reject Product",
          variant: "destructive",
          icon: "XCircle",
        });
        break;
      case ProductStatusEnum.Rejected:
        actions.push({
          type: "approve",
          label: "Approve Product",
          variant: "success",
          icon: "CheckCircle",
        });
        break;
    }

    // Always available actions
    actions.push({
      type: "view_store",
      label: "View Store",
      variant: "outline",
      icon: "Store",
    });

    return actions;
  }

  /**
   * Get product risk assessment
   */
  getRiskAssessment(): RiskAssessment {
    let riskScore = 0;
    const factors: string[] = [];

    // Check if product has images
    if (!this.productData.images || this.productData.images.length === 0) {
      riskScore += 30;
      factors.push("No product images");
    }

    // Check description quality
    if (
      !this.productData.description ||
      this.productData.description.length < 50
    ) {
      riskScore += 25;
      factors.push("Insufficient product description");
    }

    // Check if product is verified
    if (!this.productData.isVerifiedProduct) {
      riskScore += 20;
      factors.push("Unverified product");
    }

    // Check price validity
    if (!this.productData.price || this.productData.price <= 0) {
      riskScore += 25;
      factors.push("Invalid price");
    }

    return {
      score: Math.min(riskScore, 100),
      level: this.getRiskLevel(riskScore),
      factors,
    };
  }

  /**
   * Get product compliance status
   */
  getComplianceStatus(): ComplianceStatus {
    const checks: ComplianceCheck[] = [
      {
        name: "Product Images",
        status:
          (this.productData.images?.length ?? 0) > 0 ? "passed" : "failed",
        description: "At least one product image",
      },
      {
        name: "Product Description",
        status:
          (this.productData.description?.length ?? 0) >= 50
            ? "passed"
            : "failed",
        description: "Detailed product description (min 50 characters)",
      },
      {
        name: "Valid Price",
        status: (this.productData.price ?? 0) > 0 ? "passed" : "failed",
        description: "Product has a valid price",
      },
      {
        name: "Category Assigned",
        status: this.productData.category ? "passed" : "failed",
        description: "Product category is set",
      },
      {
        name: "Product Name",
        status: this.productData.name?.length >= 3 ? "passed" : "warning",
        description: "Product has a descriptive name",
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
    const analytics = this.getProductAnalytics();
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

  private calculateProductAge(): number {
    const createdAt = new Date(this.productData.createdAt);
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
      this.productData.status === ProductStatusEnum.Pending &&
      compliance.level === "high"
    ) {
      return "Ready for approval - All compliance checks passed";
    }
    return "Monitor product - No immediate action required";
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
  type: string;
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

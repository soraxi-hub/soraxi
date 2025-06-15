/**
 * Onboarding-related TypeScript interfaces and types
 * These extend the existing store model for the onboarding flow
 */

export interface OnboardingStep {
  id: string
  title: string
  description: string
  path: string
  isCompleted: boolean
  isActive: boolean
}

export interface OnboardingProgress {
  currentStep: number
  completedSteps: string[]
  totalSteps: number
  percentage: number
}

export interface StoreProfileData {
  name: string
  description: string
  logoUrl?: string
  bannerUrl?: string
}

export interface BusinessInfoData {
  businessName?: string
  type: "individual" | "company"
  registrationNumber?: string
  taxId?: string
  documentUrls?: string[]
}

export interface ShippingMethodData {
  name: string
  price: number
  estimatedDeliveryDays?: number
  description?: string
  applicableRegions?: string[]
  conditions?: {
    minOrderValue?: number
    maxOrderValue?: number
    minWeight?: number
    maxWeight?: number
  }
}

export interface PayoutData {
  payoutMethod: "Bank Transfer"
  bankDetails: {
    bankName: string
    accountNumber: string
    accountHolderName: string
    bankCode: number
    bankId?: number
  }
}

export interface OnboardingData {
  profile: StoreProfileData
  businessInfo: BusinessInfoData
  shipping: ShippingMethodData[]
  payout: PayoutData
  termsAgreed: boolean
}

"use client"

import type React from "react"

import { StoreOnboardingProvider } from "@/contexts/StoreOnboardingContext"

/**
 * Onboarding Layout
 * Wraps all onboarding pages with the StoreOnboardingProvider
 * This ensures onboarding state is available throughout the flow
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StoreOnboardingProvider>{children}</StoreOnboardingProvider>
}

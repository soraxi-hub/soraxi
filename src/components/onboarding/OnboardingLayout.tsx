"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useStoreOnboarding } from "@/contexts/store-onboarding-context";
import { ProgressTracker } from "./ProgressTracker";
import { toast } from "sonner";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { pageCardLg } from "@/modules/store/components/page-card.styles";

/**
 * Onboarding Layout Component
 * Provides consistent layout for all onboarding steps
 * Includes progress tracker, navigation, and save draft functionality
 */
interface OnboardingLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function OnboardingLayout({
  children,
  title,
  description,
  showBackButton = true,
  onBack,
}: OnboardingLayoutProps) {
  const router = useRouter();
  const { saveDraft, state } = useStoreOnboarding();

  /**
   * Handle save draft action
   * Saves current progress and shows user feedback
   */
  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      toast.success(`Your progress has been saved successfully.`);
    } catch (error: unknown) {
      toast.error(`Failed to save your progress. Please try again.`);
      console.error("Error saving draft:", error);
    }
  };

  /**
   * Handle back navigation
   * Either uses custom onBack handler or navigates to dashboard
   */
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <ProgressTracker />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <SoraxiCard className={`mb-6 ${pageCardLg}`}>
              <SoraxiCardHeader className="flex flex-col w-full justify-between gap-4">
                <div>
                  <SoraxiCardTitle className="text-2xl font-bold">
                    {title}
                  </SoraxiCardTitle>
                  <SoraxiCardDescription className="text-muted-foreground mt-1">
                    {description}
                  </SoraxiCardDescription>
                </div>
                <div className="flex items-center space-x-4 justify-between w-full">
                  {showBackButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  )}
                  {/* Save Draft Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveDraft}
                    disabled={state.isLoading}
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Draft</span>
                  </Button>
                </div>
              </SoraxiCardHeader>
            </SoraxiCard>

            {/* Form Content */}
            <SoraxiCard className={pageCardLg}>
              <SoraxiCardContent>{children}</SoraxiCardContent>
            </SoraxiCard>
          </div>
        </div>
      </div>
    </div>
  );
}

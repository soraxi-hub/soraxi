"use client";

import { Check, Circle } from "lucide-react";
import { useStoreOnboarding } from "@/contexts/store-onboarding-context";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { pageCardLg } from "@/modules/store/components/page-card.styles";

/**
 * Progress Tracker Component
 * Displays the current onboarding progress with visual indicators
 * Shows completed, current, and upcoming steps
 */
export function ProgressTracker() {
  const { state } = useStoreOnboarding();
  const { steps, progress } = state;

  return (
    <SoraxiCard className={`mb-6 ${pageCardLg}`}>
      <SoraxiCardHeader>
        <div className="flex items-center justify-between">
          <SoraxiCardTitle className="text-lg">Setup Progress</SoraxiCardTitle>
          <span className="text-sm text-muted-foreground">
            {progress.percentage}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div
            className="bg-soraxi-green h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </SoraxiCardHeader>

      {/* Steps List */}
      <SoraxiCardContent className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-lg transition-colors ${
              step.isActive
                ? "bg-soraxi-green/10 border border-soraxi-green/20"
                : step.isCompleted
                  ? "bg-muted/50"
                  : "bg-transparent"
            }`}
          >
            {/* Step Icon */}
            <div className="flex-shrink-0 mt-0.5">
              {step.isCompleted ? (
                <div className="w-6 h-6 bg-soraxi-green rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              ) : step.isActive ? (
                <div className="w-6 h-6 bg-soraxi-green rounded-full flex items-center justify-center">
                  <Circle className="w-3 h-3 text-white fill-current" />
                </div>
              ) : (
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                  <Circle className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 min-w-0">
              <h3
                className={`text-sm font-medium ${
                  step.isActive
                    ? "text-soraxi-green"
                    : step.isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                }`}
              >
                {step.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {step.description}
              </p>
            </div>

            {/* Step Number */}
            <div className="flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {index + 1}/{steps.length}
              </span>
            </div>
          </div>
        ))}
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

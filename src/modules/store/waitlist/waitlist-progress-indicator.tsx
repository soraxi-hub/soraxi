"use client";

import { Progress } from "@/components/ui/progress";
import { Building2, LayoutGrid, ShieldCheck } from "lucide-react";

interface WaitlistProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepProgress: number;
}

const STEP_CONFIG = [
  {
    title: "Business & Contact",
    description: "Your details",
    icon: Building2,
  },
  {
    title: "Category & Model",
    description: "What you sell",
    icon: LayoutGrid,
  },
  {
    title: "Proof & Samples",
    description: "Verify your business",
    icon: ShieldCheck,
  },
];

export function WaitlistProgressIndicator({
  currentStep,
  totalSteps,
  stepProgress,
}: WaitlistProgressIndicatorProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(stepProgress)}%
          </span>
        </div>
        <Progress
          value={stepProgress}
          indicatorClassName="bg-[#14a800]"
          className="h-2"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {STEP_CONFIG.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full mb-2 transition-all
                  ${
                    isCurrent
                      ? "bg-[#14a800] text-white ring-2 ring-[#14a800] ring-offset-2 dark:ring-offset-gray-950"
                      : isCompleted
                        ? "bg-[#14a800]/20 text-[#14a800]"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                  }
                `}
              >
                {index + 1}
              </div>
              <div className="text-center">
                <p
                  className={`text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "text-gray-900 dark:text-white"
                      : isCompleted
                        ? "text-[#14a800]"
                        : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

WaitlistProgressIndicator.displayName = "WaitlistProgressIndicator";

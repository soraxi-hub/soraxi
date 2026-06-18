"use client";

import { Progress } from "@/components/ui/progress";
import {
  FileText,
  DollarSign,
  Grid3X3,
  Images,
  CheckSquare,
} from "lucide-react";

interface WizardProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepProgress: number;
}

const STEP_CONFIG = [
  {
    title: "Category & Audience",
    description: "Category & audience",
    icon: Grid3X3,
  },
  {
    title: "Pricing & Inventory",
    description: "Price & quantity",
    icon: DollarSign,
  },
  {
    title: "Product Details",
    description: "Product details",
    icon: FileText,
  },
  {
    title: "Images",
    description: "Product images",
    icon: Images,
  },
  {
    title: "Review & Publish",
    description: "Review & publish",
    icon: CheckSquare,
  },
];

export function WizardProgressIndicator({
  currentStep,
  totalSteps,
  stepProgress,
}: WizardProgressIndicatorProps) {
  return (
    <div className="space-y-6">
      {/* Progress Bar */}
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

      {/* Step Indicators (circles + icons) */}
      <div className="grid grid-cols-5 gap-2 md:gap-4">
        {STEP_CONFIG.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          // const Icon = step.icon;

          return (
            <div key={index} className="flex flex-col items-center">
              {/* Circle with icon */}
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
                {/* <Icon className="w-5 h-5" /> */}
                {index + 1}
              </div>

              {/* Two-line label */}
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
                <p className="text-xs text-gray-500 dark:text-gray-500">
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

WizardProgressIndicator.displayName = "WizardProgressIndicator";

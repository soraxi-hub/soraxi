"use client";

import type React from "react";
import { createContext, useContext, useReducer, useCallback } from "react";
import type {
  OnboardingData,
  OnboardingProgress,
  OnboardingStep,
} from "@/types/onboarding";

/**
 * Store Onboarding Context for managing onboarding state across components
 * This provides centralized state management for the entire onboarding flow
 */

// Onboarding global state structure
interface OnboardingState {
  data: Partial<OnboardingData>;
  progress: OnboardingProgress;
  steps: OnboardingStep[];
  isLoading: boolean;
  error: string | null;
  storeId: string | null;
}

// Action types for reducer
type OnboardingAction =
  | { type: "SET_STORE_ID"; payload: string }
  | {
      type: "UPDATE_DATA";
      payload: {
        step: keyof OnboardingData;
        data: Partial<OnboardingData[keyof OnboardingData]>;
      };
    }
  | { type: "SET_PROGRESS"; payload: OnboardingProgress }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "MARK_STEP_COMPLETED"; payload: string }
  | { type: "SET_CURRENT_STEP"; payload: number }
  | { type: "INITIALIZE_DATA"; payload: Partial<OnboardingData> };

// Initial static step configuration
const initialSteps: OnboardingStep[] = [
  {
    id: "profile",
    title: "Store Profile",
    description: "Set up your store name, logo, and description",
    path: "/dashboard/store/onboarding/profile",
    isCompleted: false,
    isActive: true,
  },
  {
    id: "business-info",
    title: "Business Information",
    description: "Provide your business details and documents",
    path: "/dashboard/store/onboarding/business-info",
    isCompleted: false,
    isActive: false,
  },
  {
    id: "shipping",
    title: "Shipping Methods",
    description: "Configure your shipping options",
    path: "/dashboard/store/onboarding/shipping",
    isCompleted: false,
    isActive: false,
  },
  {
    id: "payout",
    title: "Payout Setup",
    description: "Add your bank details for payments",
    path: "/dashboard/store/onboarding/payout",
    isCompleted: false,
    isActive: false,
  },
  {
    id: "terms",
    title: "Terms & Submit",
    description: "Review and agree to platform terms",
    path: "/dashboard/store/onboarding/terms",
    isCompleted: false,
    isActive: false,
  },
];

// Initial reducer state
const initialState: OnboardingState = {
  data: {},
  progress: {
    currentStep: 0,
    completedSteps: [],
    totalSteps: initialSteps.length,
    percentage: 0,
  },
  steps: initialSteps,
  isLoading: false,
  error: null,
  storeId: null,
};

// Reducer function to manage onboarding state transitions
function onboardingReducer(
  state: OnboardingState,
  action: OnboardingAction
): OnboardingState {
  switch (action.type) {
    case "SET_STORE_ID":
      return { ...state, storeId: action.payload };

    case "UPDATE_DATA":
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.step]: action.payload.data,
        },
      };

    case "SET_PROGRESS":
      return { ...state, progress: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "MARK_STEP_COMPLETED":
      const updatedSteps = state.steps.map((step) => ({
        ...step,
        isCompleted: step.id === action.payload ? true : step.isCompleted,
      }));

      const completedSteps = [...state.progress.completedSteps];
      if (!completedSteps.includes(action.payload)) {
        completedSteps.push(action.payload);
      }

      return {
        ...state,
        steps: updatedSteps,
        progress: {
          ...state.progress,
          completedSteps,
          percentage: Math.round(
            (completedSteps.length / state.steps.length) * 100
          ),
        },
      };

    case "SET_CURRENT_STEP":
      const stepsWithActiveState = state.steps.map((step, index) => ({
        ...step,
        isActive: index === action.payload,
      }));

      return {
        ...state,
        steps: stepsWithActiveState,
        progress: {
          ...state.progress,
          currentStep: action.payload,
        },
      };

    case "INITIALIZE_DATA":
      return {
        ...state,
        data: action.payload,
      };

    default:
      return state;
  }
}

// Onboarding context shape
interface OnboardingContextType {
  state: OnboardingState;
  updateData: <K extends keyof OnboardingData>(
    step: K,
    data: Partial<OnboardingData[K]>
  ) => void;
  markStepCompleted: (stepId: string) => void;
  setCurrentStep: (stepIndex: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStoreId: (storeId: string) => void;
  initializeData: (data: Partial<OnboardingData>) => void;
  saveDraft: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

// Provider component
export function StoreOnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  const updateData = useCallback(
    <K extends keyof OnboardingData>(
      step: K,
      data: Partial<OnboardingData[K]>
    ) => {
      dispatch({ type: "UPDATE_DATA", payload: { step, data } });
    },
    []
  );

  const markStepCompleted = useCallback((stepId: string) => {
    dispatch({ type: "MARK_STEP_COMPLETED", payload: stepId });
  }, []);

  const setCurrentStep = useCallback((stepIndex: number) => {
    dispatch({ type: "SET_CURRENT_STEP", payload: stepIndex });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_LOADING", payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: "SET_ERROR", payload: error });
  }, []);

  const setStoreId = useCallback((storeId: string) => {
    dispatch({ type: "SET_STORE_ID", payload: storeId });
  }, []);

  const initializeData = useCallback((data: Partial<OnboardingData>) => {
    dispatch({ type: "INITIALIZE_DATA", payload: data });
  }, []);

  /**
   * Save current onboarding progress as draft to the database
   * This allows users to resume their onboarding later
   */
  const saveDraft = useCallback(async () => {
    if (!state.storeId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/store/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: state.storeId,
          data: state.data,
          progress: state.progress,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      setError("Failed to save draft. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [state.storeId, state.data, state.progress, setLoading, setError]);

  const value: OnboardingContextType = {
    state,
    updateData,
    markStepCompleted,
    setCurrentStep,
    setLoading,
    setError,
    setStoreId,
    initializeData,
    saveDraft,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

// Hook to access the onboarding context
export function useStoreOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error(
      "useStoreOnboarding must be used within a StoreOnboardingProvider"
    );
  }
  return context;
}

// "use client"

// import type React from "react"
// import { createContext, useContext, useReducer, useCallback } from "react"
// import type { OnboardingData, OnboardingProgress, OnboardingStep } from "@/types/onboarding"

// /**
//  * Store Onboarding Context for managing onboarding state across components
//  * This provides centralized state management for the entire onboarding flow
//  */

// interface OnboardingState {
//   data: Partial<OnboardingData>
//   progress: OnboardingProgress
//   steps: OnboardingStep[]
//   isLoading: boolean
//   error: string | null
//   storeId: string | null
// }

// type OnboardingAction =
//   | { type: "SET_STORE_ID"; payload: string }
//   | { type: "UPDATE_DATA"; payload: { step: keyof OnboardingData; data: any } }
//   | { type: "SET_PROGRESS"; payload: OnboardingProgress }
//   | { type: "SET_LOADING"; payload: boolean }
//   | { type: "SET_ERROR"; payload: string | null }
//   | { type: "MARK_STEP_COMPLETED"; payload: string }
//   | { type: "SET_CURRENT_STEP"; payload: number }
//   | { type: "INITIALIZE_DATA"; payload: Partial<OnboardingData> }

// const initialSteps: OnboardingStep[] = [
//   {
//     id: "profile",
//     title: "Store Profile",
//     description: "Set up your store name, logo, and description",
//     path: "/dashboard/store/onboarding/profile",
//     isCompleted: false,
//     isActive: true,
//   },
//   {
//     id: "business-info",
//     title: "Business Information",
//     description: "Provide your business details and documents",
//     path: "/dashboard/store/onboarding/business-info",
//     isCompleted: false,
//     isActive: false,
//   },
//   {
//     id: "shipping",
//     title: "Shipping Methods",
//     description: "Configure your shipping options",
//     path: "/dashboard/store/onboarding/shipping",
//     isCompleted: false,
//     isActive: false,
//   },
//   {
//     id: "payout",
//     title: "Payout Setup",
//     description: "Add your bank details for payments",
//     path: "/dashboard/store/onboarding/payout",
//     isCompleted: false,
//     isActive: false,
//   },
//   {
//     id: "terms",
//     title: "Terms & Submit",
//     description: "Review and agree to platform terms",
//     path: "/dashboard/store/onboarding/terms",
//     isCompleted: false,
//     isActive: false,
//   },
// ]

// const initialState: OnboardingState = {
//   data: {},
//   progress: {
//     currentStep: 0,
//     completedSteps: [],
//     totalSteps: initialSteps.length,
//     percentage: 0,
//   },
//   steps: initialSteps,
//   isLoading: false,
//   error: null,
//   storeId: null,
// }

// function onboardingReducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
//   switch (action.type) {
//     case "SET_STORE_ID":
//       return { ...state, storeId: action.payload }

//     case "UPDATE_DATA":
//       return {
//         ...state,
//         data: {
//           ...state.data,
//           [action.payload.step]: action.payload.data,
//         },
//       }

//     case "SET_PROGRESS":
//       return { ...state, progress: action.payload }

//     case "SET_LOADING":
//       return { ...state, isLoading: action.payload }

//     case "SET_ERROR":
//       return { ...state, error: action.payload }

//     case "MARK_STEP_COMPLETED":
//       const updatedSteps = state.steps.map((step) => ({
//         ...step,
//         isCompleted: step.id === action.payload ? true : step.isCompleted,
//       }))

//       const completedSteps = [...state.progress.completedSteps]
//       if (!completedSteps.includes(action.payload)) {
//         completedSteps.push(action.payload)
//       }

//       return {
//         ...state,
//         steps: updatedSteps,
//         progress: {
//           ...state.progress,
//           completedSteps,
//           percentage: Math.round((completedSteps.length / state.steps.length) * 100),
//         },
//       }

//     case "SET_CURRENT_STEP":
//       const stepsWithActiveState = state.steps.map((step, index) => ({
//         ...step,
//         isActive: index === action.payload,
//       }))

//       return {
//         ...state,
//         steps: stepsWithActiveState,
//         progress: {
//           ...state.progress,
//           currentStep: action.payload,
//         },
//       }

//     case "INITIALIZE_DATA":
//       return {
//         ...state,
//         data: action.payload,
//       }

//     default:
//       return state
//   }
// }

// interface OnboardingContextType {
//   state: OnboardingState
//   updateData: (step: keyof OnboardingData, data: any) => void
//   markStepCompleted: (stepId: string) => void
//   setCurrentStep: (stepIndex: number) => void
//   setLoading: (loading: boolean) => void
//   setError: (error: string | null) => void
//   setStoreId: (storeId: string) => void
//   initializeData: (data: Partial<OnboardingData>) => void
//   saveDraft: () => Promise<void>
// }

// const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

// export function StoreOnboardingProvider({ children }: { children: React.ReactNode }) {
//   const [state, dispatch] = useReducer(onboardingReducer, initialState)

//   const updateData = useCallback((step: keyof OnboardingData, data: any) => {
//     dispatch({ type: "UPDATE_DATA", payload: { step, data } })
//   }, [])

//   const markStepCompleted = useCallback((stepId: string) => {
//     dispatch({ type: "MARK_STEP_COMPLETED", payload: stepId })
//   }, [])

//   const setCurrentStep = useCallback((stepIndex: number) => {
//     dispatch({ type: "SET_CURRENT_STEP", payload: stepIndex })
//   }, [])

//   const setLoading = useCallback((loading: boolean) => {
//     dispatch({ type: "SET_LOADING", payload: loading })
//   }, [])

//   const setError = useCallback((error: string | null) => {
//     dispatch({ type: "SET_ERROR", payload: error })
//   }, [])

//   const setStoreId = useCallback((storeId: string) => {
//     dispatch({ type: "SET_STORE_ID", payload: storeId })
//   }, [])

//   const initializeData = useCallback((data: Partial<OnboardingData>) => {
//     dispatch({ type: "INITIALIZE_DATA", payload: data })
//   }, [])

//   /**
//    * Save current onboarding progress as draft to the database
//    * This allows users to resume their onboarding later
//    */
//   const saveDraft = useCallback(async () => {
//     if (!state.storeId) return

//     setLoading(true)
//     setError(null)

//     try {
//       const response = await fetch("/api/store/onboarding/draft", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           storeId: state.storeId,
//           data: state.data,
//           progress: state.progress,
//         }),
//       })

//       if (!response.ok) {
//         throw new Error("Failed to save draft")
//       }
//     } catch (error) {
//       console.error("Error saving draft:", error)
//       setError("Failed to save draft. Please try again.")
//     } finally {
//       setLoading(false)
//     }
//   }, [state.storeId, state.data, state.progress, setLoading, setError])

//   const value: OnboardingContextType = {
//     state,
//     updateData,
//     markStepCompleted,
//     setCurrentStep,
//     setLoading,
//     setError,
//     setStoreId,
//     initializeData,
//     saveDraft,
//   }

//   return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
// }

// export function useStoreOnboarding() {
//   const context = useContext(OnboardingContext)
//   if (context === undefined) {
//     throw new Error("useStoreOnboarding must be used within a StoreOnboardingProvider")
//   }
//   return context
// }

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface UseUnsavedChangesOptions<T> {
  initialData: T;
  currentData: T;
  additionalDirtyCheck?: boolean;
  onSaveBeforeLeave?: () => Promise<boolean>;
}

interface UseUnsavedChangesReturn {
  isDirty: boolean;
  showDialog: boolean;
  isSaving: boolean;
  setShowDialog: (show: boolean) => void;
  confirmNavigation: (action: () => void) => void;
  handleDialogAction: (action: "save" | "leave" | "cancel") => Promise<void>;
  resetDirtyState: () => void;
}

/**
 * Custom hook for handling unsaved changes protection
 * Provides browser tab close warning and in-app navigation confirmation
 */
export function useUnsavedChanges<T extends Record<string, any>>({
  initialData,
  currentData,
  additionalDirtyCheck = false,
  onSaveBeforeLeave,
}: UseUnsavedChangesOptions<T>): UseUnsavedChangesReturn {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [manualDirtyReset, setManualDirtyReset] = useState(false);

  // Deep comparison to check if form data has changed
  const isDirty = useMemo(() => {
    if (manualDirtyReset) return false;

    // Compare each field in the form data
    const hasChanges = Object.keys(currentData).some((key) => {
      const currentValue = currentData[key];
      const initialValue = initialData[key];

      // Handle arrays with deep comparison
      if (Array.isArray(currentValue) && Array.isArray(initialValue)) {
        return JSON.stringify(currentValue) !== JSON.stringify(initialValue);
      }

      // Handle objects with deep comparison
      if (
        typeof currentValue === "object" &&
        currentValue !== null &&
        typeof initialValue === "object" &&
        initialValue !== null
      ) {
        return JSON.stringify(currentValue) !== JSON.stringify(initialValue);
      }

      // Handle primitive values
      return currentValue !== initialValue;
    });

    return hasChanges || additionalDirtyCheck;
  }, [currentData, initialData, additionalDirtyCheck, manualDirtyReset]);

  // Handle browser tab/window close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSaving) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isSaving]);

  // Confirm navigation with unsaved changes check
  const confirmNavigation = useCallback(
    (action: () => void) => {
      if (isDirty) {
        setPendingAction(() => action);
        setShowDialog(true);
      } else {
        action();
      }
    },
    [isDirty]
  );

  // Handle dialog actions (save, leave, cancel)
  const handleDialogAction = useCallback(
    async (action: "save" | "leave" | "cancel") => {
      if (action === "cancel") {
        setShowDialog(false);
        setPendingAction(null);
        return;
      }

      if (action === "leave") {
        setManualDirtyReset(true);
        setShowDialog(false);

        // Execute pending action after state update
        setTimeout(() => {
          if (pendingAction) {
            pendingAction();
          }
          setPendingAction(null);
        }, 0);
        return;
      }

      if (action === "save" && onSaveBeforeLeave) {
        setIsSaving(true);
        const success = await onSaveBeforeLeave();
        setIsSaving(false);

        if (success) {
          setManualDirtyReset(true);
          setShowDialog(false);

          // Execute pending action after successful save
          setTimeout(() => {
            if (pendingAction) {
              pendingAction();
            }
            setPendingAction(null);
          }, 0);
        }
      }
    },
    [pendingAction, onSaveBeforeLeave]
  );

  // Reset dirty state manually (useful after successful form submission)
  const resetDirtyState = useCallback(() => {
    setManualDirtyReset(true);
    // Reset the flag after a short delay to allow for new changes
    setTimeout(() => setManualDirtyReset(false), 100);
  }, []);

  return {
    isDirty,
    showDialog,
    isSaving,
    setShowDialog,
    confirmNavigation,
    handleDialogAction,
    resetDirtyState,
  };
}

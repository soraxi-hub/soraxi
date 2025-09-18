"use client";

import { useState, useEffect } from "react";

interface UseFeedbackPopupProps {
  page: "user" | "store-dashboard" | "payment-success";
  delay?: number; // in milliseconds
}

export function useFeedbackPopup({ page, delay = 0 }: UseFeedbackPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    // Check if feedback popup has been shown in this session
    const sessionKey = `feedback_shown_${page}`;
    const hasShownInSession = sessionStorage.getItem(sessionKey);

    if (hasShownInSession) {
      setHasBeenShown(true);
      return;
    }

    // Show popup after delay
    const timer = setTimeout(() => {
      if (!hasBeenShown) {
        setIsOpen(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [page, delay, hasBeenShown]);

  const closeFeedback = () => {
    setIsOpen(false);
    setHasBeenShown(true);
    // Mark as shown in session storage
    sessionStorage.setItem(`feedback_shown_${page}`, "true");
  };

  const submitFeedback = () => {
    closeFeedback();
  };

  return {
    isOpen,
    closeFeedback,
    submitFeedback,
    hasBeenShown,
  };
}

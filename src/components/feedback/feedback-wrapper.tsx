"use client";

import type React from "react";

import { FeedbackPopup } from "./feedback-popup";
import { useFeedbackPopup } from "@/hooks/use-feedback-popup";
import { FeedbackPageEnum } from "@/enums";

interface FeedbackWrapperProps {
  page: FeedbackPageEnum;
  delay?: number;
  children?: React.ReactNode;
}

export function FeedbackWrapper({
  page,
  delay = 0,
  children,
}: FeedbackWrapperProps) {
  const { isOpen, closeFeedback } = useFeedbackPopup({ page, delay });

  return (
    <>
      {children}
      <FeedbackPopup
        isOpen={isOpen}
        onCloseAction={closeFeedback}
        page={page}
      />
    </>
  );
}

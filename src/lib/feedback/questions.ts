import { FeedbackPageEnum } from "@/enums";

export interface FeedbackQuestion {
  id: string;
  question: string;
  type: "rating" | "text" | "multiple-choice";
  options?: string[];
  required: boolean;
}

/**
 * Lightweight question set for click-triggered feedback (the floating
 * button) — the person already has something specific to say, so this
 * stays to one optional rating plus one required free-text field rather
 * than the structured multi-question survey used after checkout.
 */
const lightweightQuestions: FeedbackQuestion[] = [
  {
    id: "rating",
    question: "How would you rate your experience?",
    type: "rating",
    required: false,
  },
  {
    id: "comment",
    question: "What's on your mind?",
    type: "text",
    required: true,
  },
];

export const feedbackQuestions: Record<FeedbackPageEnum, FeedbackQuestion[]> =
  {
    [FeedbackPageEnum.User]: lightweightQuestions,
    [FeedbackPageEnum.StoreDashboard]: lightweightQuestions,
    [FeedbackPageEnum.General]: lightweightQuestions,
    [FeedbackPageEnum.PaymentSuccess]: [
      {
        id: "checkout_experience",
        question: "How was your checkout experience?",
        type: "rating",
        required: true,
      },
      {
        id: "payment_ease",
        question: "How easy was it to complete your payment?",
        type: "multiple-choice",
        options: [
          "Very Easy",
          "Easy",
          "Neutral",
          "Difficult",
          "Very Difficult",
        ],
        required: true,
      },
      {
        id: "payment_security",
        question: "How secure did you feel during the payment process?",
        type: "rating",
        required: true,
      },
      {
        id: "improvement_suggestions",
        question:
          "Any suggestions to improve the checkout or payment process?",
        type: "text",
        required: false,
      },
    ],
  };

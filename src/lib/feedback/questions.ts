export interface FeedbackQuestion {
  id: string;
  question: string;
  type: "rating" | "text" | "multiple-choice";
  options?: string[];
  required: boolean;
}

export const feedbackQuestions: Record<string, FeedbackQuestion[]> = {
  user: [
    {
      id: "overall_experience",
      question: "How would you rate your overall experience on our platform?",
      type: "rating",
      required: true,
    },
    {
      id: "ease_of_use",
      question: "How easy is it to find and purchase products?",
      type: "multiple-choice",
      options: ["Very Easy", "Easy", "Neutral", "Difficult", "Very Difficult"],
      required: true,
    },
    {
      id: "missing_features",
      question:
        "What features would you like to see added to improve your shopping experience?",
      type: "text",
      required: false,
    },
    {
      id: "recommendation",
      question: "How likely are you to recommend our platform to friends?",
      type: "rating",
      required: true,
    },
  ],
  "store-dashboard": [
    {
      id: "dashboard_usability",
      question: "How would you rate the usability of the store dashboard?",
      type: "rating",
      required: true,
    },
    {
      id: "most_useful_feature",
      question: "Which dashboard feature do you find most useful?",
      type: "multiple-choice",
      options: [
        "Product Management",
        "Order Management",
        "Wallet System",
        // "Analytics",
        // "Customer Communication",
        // "Financial Reports",
      ],
      required: true,
    },
    {
      id: "missing_tools",
      question:
        "What tools or features are missing from the dashboard that would help your business?",
      type: "text",
      required: false,
    },
    {
      id: "performance_rating",
      question: "How would you rate the dashboard's performance and speed?",
      type: "rating",
      required: true,
    },
    {
      id: "support_satisfaction",
      question:
        "How satisfied are you with the support and resources provided?",
      type: "rating",
      required: true,
    },
  ],
  "payment-success": [
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
      options: ["Very Easy", "Easy", "Neutral", "Difficult", "Very Difficult"],
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
      question: "Any suggestions to improve the checkout or payment process?",
      type: "text",
      required: false,
    },
  ],
};

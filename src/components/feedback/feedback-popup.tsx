"use client";

import { useState } from "react";
import { Star, Send, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  feedbackQuestions,
  type FeedbackQuestion,
} from "@/lib/feedback/questions";
import { toast } from "sonner";

interface FeedbackPopupProps {
  isOpen: boolean;
  onCloseAction: () => void;
  page: "user" | "store-dashboard" | "payment-success";
}

interface FeedbackAnswer {
  questionId: string;
  answer: string;
}

export function FeedbackPopup({
  isOpen,
  onCloseAction,
  page,
}: FeedbackPopupProps) {
  const [answers, setAnswers] = useState<FeedbackAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions = feedbackQuestions[page] || [];

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId);
      if (existing) {
        return prev.map((a) =>
          a.questionId === questionId ? { ...a, answer } : a
        );
      }
      return [...prev, { questionId, answer }];
    });
  };

  const getAnswer = (questionId: string) => {
    return answers.find((a) => a.questionId === questionId)?.answer || "";
  };

  const isFormValid = () => {
    const requiredQuestions = questions.filter((q) => q.required);
    return requiredQuestions.every((q) => getAnswer(q.id));
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error("Please complete all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData = {
        page,
        answers: questions
          .map((q) => ({
            question: q.question,
            answer: getAnswer(q.id),
            type: q.type,
          }))
          .filter((a) => a.answer), // Only include answered questions
        userAgent: navigator.userAgent,
        sessionId: Math.random().toString(36).substring(7),
      };

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.ok) {
        toast.success("Thank you for your feedback!");
        onCloseAction();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Error submitting feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: FeedbackQuestion) => {
    switch (question.type) {
      case "rating":
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {question.question}
              {question.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() =>
                    handleAnswerChange(question.id, rating.toString())
                  }
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${
                      Number.parseInt(getAnswer(question.id)) >= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {getAnswer(question.id) && `${getAnswer(question.id)}/5`}
              </span>
            </div>
          </div>
        );

      case "multiple-choice":
        return (
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              {question.question}
              {question.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <RadioGroup
              value={getAnswer(question.id)}
              onValueChange={(value) => handleAnswerChange(question.id, value)}
            >
              {question.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option}
                    id={`${question.id}-${option}`}
                  />
                  <Label
                    htmlFor={`${question.id}-${option}`}
                    className="text-sm"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case "text":
        return (
          <div className="space-y-3">
            <Label htmlFor={question.id} className="text-sm font-medium">
              {question.question}
              {question.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
            <Textarea
              id={question.id}
              placeholder="Share your thoughts..."
              value={getAnswer(question.id)}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getPageTitle = () => {
    switch (page) {
      case "user":
        return "Help Us Improve Your Shopping Experience";
      case "store-dashboard":
        return "Help Us Improve Your Store Management Experience";
      case "payment-success":
        return "How Was Your Checkout Experience?";
      default:
        return "Share Your Feedback";
    }
  };

  const getPageDescription = () => {
    switch (page) {
      case "user":
        return "Your feedback helps us create a better shopping experience for everyone.";
      case "store-dashboard":
        return "Help us build better tools for your business success.";
      case "payment-success":
        return "Your input helps us improve our checkout and payment process.";
      default:
        return "We value your opinion and use it to improve our platform.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="sm:max-w-[500px] lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-soraxi-green/20 rounded-full sm:inline-flex items-center justify-center hidden">
                <MessageSquare className="w-4 h-4 text-soraxi-green" />
              </div>
              <DialogTitle className="text-lg font-semibold text-center">
                {getPageTitle()}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {getPageDescription()}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="p-6 space-y-6">
            {questions.map((question, index) => (
              <div key={question.id}>
                {renderQuestion(question)}
                {index < questions.length - 1 && (
                  <div className="border-b border-gray-100 mt-6" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={onCloseAction}
            disabled={isSubmitting}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

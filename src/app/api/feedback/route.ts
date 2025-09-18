import { FeedBackProps } from "@/domain/feedback/feedback";
import { FeedBackFactory } from "@/domain/feedback/feedback-factory";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/app-error";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { generateUniqueId } from "@/lib/utils";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { FeedBackRepo } from "@/repositories/feedback-repo";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { page, answers, userAgent, sessionId } = body as {
      page: FeedBackProps[`feedBackPage`];
      answers: FeedBackProps[`answers`];
      userAgent: FeedBackProps[`userAgent`];
      sessionId: FeedBackProps[`sessionId`];
    };

    console.log(`page`, page);

    // Validate required fields
    if (!page || !answers || !Array.isArray(answers)) {
      throw new AppError("Missing required fields", 400);
    }

    // Validate page type
    if (!FeedBackRepo.isValidFeedBackPage(page)) {
      throw new AppError("Invalid page type", 400);
    }

    // Validate answers format
    const validAnswers = FeedBackRepo.validateAnswers(answers);

    if (validAnswers.length === 0) {
      throw new AppError("No valid answers provided", 400);
    }

    await connectToDatabase();
    const user = await getUserFromCookie();

    // Create feedback document
    const feedbackData = {
      userId: user?.id || null,
      feedBackPage: page,
      answers: validAnswers,
      userAgent: userAgent || request.headers.get("user-agent"),
      sessionId: sessionId || generateUniqueId(7),
    };

    const feedback = FeedBackFactory.createFeedback(feedbackData);
    await FeedBackRepo.saveFeedBack(feedback);

    return NextResponse.json(
      {
        message: "Feedback submitted successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting feedback:", error);
    handleApiError(error);
  }
}

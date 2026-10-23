import { FeedBack, FeedBackProps } from "@/domain/feedback/feedback";
import { getFeedbackModel } from "@/lib/db/models/feedback.model";
import { FeedbackPageEnum } from "@/enums";

export class FeedBackRepo {
  static async saveFeedBack(feedback: FeedBack) {
    const FeedBack = await getFeedbackModel();

    const newFeedback = new FeedBack({
      feedBackPage: feedback.getFeedBackPage(),
      answers: feedback.getAnswer(),
      userAgent: feedback.getUserAgent(),
      userId: feedback.getUserId(),
      sessionId: feedback.getSeeeionId(),
    });

    await newFeedback.save();
  }

  static isValidFeedBackPage(feedBackPage: FeedBackProps[`feedBackPage`]) {
    return Object.values(FeedbackPageEnum).includes(feedBackPage);
  }

  static validateAnswers(answers: FeedBackProps[`answers`]) {
    return answers.filter(
      (answer) =>
        answer.question &&
        answer.answer &&
        answer.type &&
        ["rating", "text", "multiple-choice"].includes(answer.type)
    );
  }
}

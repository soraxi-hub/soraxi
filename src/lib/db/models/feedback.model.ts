import mongoose, { type Document, Model, Schema } from "mongoose";
import { connectToDatabase } from "../mongoose";

export interface IFeedback extends Document {
  userId?: mongoose.Schema.Types.ObjectId;
  feedBackPage: "user" | "store-dashboard" | "payment-success";
  answers: {
    question: string;
    answer: string;
    type: "rating" | "text" | "multiple-choice";
  }[];
  userAgent?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    feedBackPage: {
      type: String,
      enum: ["user", "store-dashboard", "payment-success"],
      required: true,
    },
    answers: [
      {
        question: {
          type: String,
          required: true,
        },
        answer: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["rating", "text", "multiple-choice"],
          required: true,
        },
      },
    ],
    userAgent: {
      type: String,
      required: false,
    },
    sessionId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
FeedbackSchema.index({ feedBackPage: 1, createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });

export async function getFeedbackModel(): Promise<Model<IFeedback>> {
  await connectToDatabase();

  return (
    (mongoose.models.Feedback as Model<IFeedback>) ||
    mongoose.model<IFeedback>("Feedback", FeedbackSchema)
  );
}

// export default mongoose.models.Feedback ||
//   mongoose.model<IFeedback>("Feedback", FeedbackSchema);

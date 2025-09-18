export type FeedBackProps = {
  feedBackPage: "user" | "store-dashboard" | "payment-success";
  answers: {
    question: string;
    answer: string;
    type: "rating" | "text" | "multiple-choice";
  }[];
  userId: string | null;
  userAgent?: string | null;
  sessionId?: string;
};

export class FeedBack {
  constructor(
    protected feedBackPage: FeedBackProps[`feedBackPage`],
    protected answers: FeedBackProps[`answers`],
    protected userId: FeedBackProps[`userId`],
    protected userAgent?: FeedBackProps[`userAgent`],
    protected sessionId?: string
  ) {
    this.answers = answers;
    this.feedBackPage = feedBackPage;
    this.sessionId = sessionId;
    this.userAgent = userAgent;
    this.userId = userId;
  }

  getAnswer() {
    return this.answers;
  }

  getFeedBackPage() {
    return this.feedBackPage;
  }

  getUserId() {
    return this.userId;
  }

  getUserAgent() {
    return this.userAgent;
  }

  getSeeeionId() {
    return this.sessionId;
  }
}

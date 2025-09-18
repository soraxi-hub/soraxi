import { FeedBack, FeedBackProps } from "./feedback";

export class FeedBackFactory {
  static createFeedback(props: {
    feedBackPage: FeedBackProps[`feedBackPage`];
    answers: FeedBackProps[`answers`];
    userId: FeedBackProps[`userId`];
    userAgent?: FeedBackProps[`userAgent`];
    sessionId?: string;
  }) {
    return new FeedBack(
      props.feedBackPage,
      props.answers,
      props.userId,
      props.userAgent,
      props.sessionId
    );
  }
}

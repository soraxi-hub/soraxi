export class Notification {
  constructor(protected message: string, protected recipient: string) {
    this.message = message;
    this.recipient = recipient;
  }

  getMessage(): string {
    return this.message;
  }

  getRecipient(): string {
    return this.recipient;
  }
}

export class EmailNotification extends Notification {
  constructor(
    protected message: string,
    protected recipient: string,
    protected emailType: string
  ) {
    super(message, recipient);
    this.emailType = emailType;
  }

  getEmailType(): string {
    return this.emailType;
  }

  sendEmail(): void {}
}

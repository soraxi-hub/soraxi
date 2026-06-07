import { UserDecorator } from "./user-decorator";

export class ProfileUserDecorator extends UserDecorator {
  get displayGreeting(): string {
    return `Greetings, ${this.firstName}!`;
  }
}

import { User } from "./eal";

export class Admin extends User {
  constructor(
    email: string,
    password: string,
    protected name: string,
    protected roles: string[],
    protected isActive: boolean
  ) {
    super(email, password);
    this.name = name;
    this.roles = roles;
    this.isActive = isActive;
  }

  getName(): string {
    return this.name;
  }

  getPassword(): string {
    return this.password;
  }

  getEmail(): string {
    return this.email;
  }

  getRoles() {
    return this.roles;
  }

  getIsActive() {
    return this.isActive;
  }
}

import { PasswordService } from "@/lib/utils";

export class User {
  constructor(protected email: string, protected password: string) {
    this.email = email;
    this.password = password;
  }

  getEmail(): string {
    return this.email;
  }

  getPassword(): string {
    return this.password;
  }

  getUser() {}
}

export class PublicUser extends User {
  constructor(
    email: string,
    password: string,
    protected firstName: string,
    protected lastName: string,
    protected otherNames: string,
    protected phoneNumber: string,
    protected address: string,
    protected cityOfResidence: string,
    protected stateOfResidence: string,
    protected postalCode: string,
    protected isVerified: boolean
  ) {
    super(email, password);
    this.firstName = firstName;
    this.lastName = lastName;
    this.otherNames = otherNames;
    this.phoneNumber = phoneNumber;
    this.address = address;
    this.cityOfResidence = cityOfResidence;
    this.stateOfResidence = stateOfResidence;
    this.postalCode = postalCode;
    this.isVerified = isVerified;
  }

  getFirstName(): string {
    return this.firstName;
  }

  getLastName(): string {
    return this.lastName;
  }

  getOtherNames(): string {
    return this.otherNames;
  }

  getPhoneNumber(): string {
    return this.phoneNumber;
  }
  getAddress(): string {
    return this.address;
  }

  getCityOfResidence(): string {
    return this.cityOfResidence;
  }
  getStateOfResidence(): string {
    return this.stateOfResidence;
  }
  getPostalCode(): string {
    return this.postalCode;
  }
  async hashPassword(): Promise<void> {
    this.password = await PasswordService.hashPassword(this.password);
  }
  async validatePassword(password: string): Promise<boolean> {
    return await PasswordService.validatePassword(this.password, password);
  }
}

export class AuthUser extends User {
  constructor(
    protected id: string,
    protected firstName: string,
    protected lastName: string,
    protected email: string,
    protected password: string,
    protected store?: string
  ) {
    super(email, password);
    this.id = id;
    this.lastName = lastName;
    this.firstName = firstName;
    this.store = store;
  }

  async hashPassword(): Promise<void> {
    this.password = await PasswordService.hashPassword(this.password);
  }
  async validatePassword(password: string): Promise<boolean> {
    return await PasswordService.validatePassword(this.password, password);
  }
  getId(): string {
    return this.id;
  }
  getFirstName(): string {
    return this.firstName;
  }
  getLastName(): string {
    return this.lastName;
  }
  getEmail(): string {
    return this.email;
  }
  getStore(): string | undefined {
    return this.store;
  }
}

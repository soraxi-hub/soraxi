import { PublicUser } from "@/domain/users/User";
import { getUserModel, IUser } from "@/lib/db/models/user.model";

export class UserRepository {
  // Methods for user data access would go here
  static async saveUser(user: PublicUser): Promise<void> {
    const User = await getUserModel();
    const newUser = new User({
      email: user.getEmail(),
      password: user.getPassword(),
      address: user.getAddress(),
      lastName: user.getLastName(),
      firstName: user.getFirstName(),
      otherNames: user.getOtherNames(),
      postalCode: user.getPostalCode(),
      phoneNumber: user.getPhoneNumber(),
      cityOfResidence: user.getCityOfResidence(),
      stateOfResidence: user.getStateOfResidence(),
    });
    await newUser.save();
  }

  // Check if the user exists in the database
  static async isExistingUser(email: string): Promise<boolean> {
    const User = await getUserModel();
    const user = await User.findOne({ email });
    return user !== null;
  }

  // Check if the user exists in the database
  static async isExistingPhoneNumber(phoneNumber: string): Promise<boolean> {
    const User = await getUserModel();
    const user = await User.findOne({ phoneNumber });
    return user !== null;
  }

  static async findUserByEmail(email: string): Promise<IUser | null> {
    const User = await getUserModel();
    const user = await User.findOne({ email }).select(
      "firstName lastName email password stores"
    );

    return user;
  }
}

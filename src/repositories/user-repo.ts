import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { AuthUserDecorator } from "@/domain/users/decorators/auth-user.decorator";
import { User } from "@/domain/users/user";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getUserModel, IUser, IUserDocument } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import mongoose from "mongoose";

export class UserRepository {
  // Methods for user data access would go here
  static async saveUser(user: AuthUserDecorator): Promise<void> {
    const UserModel = await getUserModel();
    const newUser = new UserModel({
      email: user.email,
      address: user.address,
      lastName: user.lastName,
      password: user.password,
      firstName: user.firstName,
      cityOfResidence: user.city,
      postalCode: user.postalCode,
      stateOfResidence: user.state,
      phoneNumber: user.phoneNumber,
    });
    await newUser.save();
  }

  static async persistUpdatedPassword(
    user: User,
  ): Promise<IUserDocument | null> {
    const UserModel = await getUserModel();

    const userDoc = await UserModel.findByIdAndUpdate(
      user.userId,
      {
        password: user.password,
      },
      { new: true },
    );

    return userDoc;
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
    const UserModel = await getUserModel();

    const user = await QueryBuilderFactory.queryBuilder<IUser, IUserDocument>(
      UserModel,
    )
      .where("email", email)
      .executeOne();

    return user;
  }

  static async findUserById(id: string): Promise<IUser | null> {
    await getStoreModel();
    const UserModel = await getUserModel();

    const user = await QueryBuilderFactory.queryBuilder<IUser, IUserDocument>(
      UserModel,
    )
      .where("_id", new mongoose.Types.ObjectId(id))
      .select(
        "firstName",
        "lastName",
        "email",
        "phoneNumber",
        "address",
        "stores",
        "cityOfResidence",
        "stateOfResidence",
        "postalCode",
        "isVerified",
        "stores",
      )
      .populate({
        path: "stores.storeId",
        select: "_id name status",
      })
      .executeOne();

    return user;
  }

  // Check if user already has a store
  static async hasStore(userId: string): Promise<boolean> {
    const User = await getUserModel();
    const existingUserStore = await User.findById(userId).select("stores");

    if (
      existingUserStore &&
      Array.isArray(existingUserStore.stores) &&
      existingUserStore.stores.length > 0
    ) {
      return true;
    }

    return false;
  }

  // Update a user's stores array
  static async updateUserStoreArray(
    userId: string,
    storeId: string,
    session: mongoose.mongo.ClientSession,
  ) {
    const User = await getUserModel();

    const updatedUser = await User.findByIdAndUpdate(
      new mongoose.Types.ObjectId(userId),
      {
        $push: {
          stores: { storeId: new mongoose.Types.ObjectId(storeId) },
        },
      },
      {
        session,
        new: true,
      },
    );

    if (!updatedUser) {
      throw new AppError(
        "NOT_FOUND",
        "User not found while updating store array",
        { userId },
      );
    }
  }
}

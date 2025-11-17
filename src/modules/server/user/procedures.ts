import { z } from "zod";
import {
  getUserByEmail,
  getUserModel,
  IUser,
} from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { User } from "@/types";
import mongoose from "mongoose";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { StoreStatusEnum } from "@/validators/store-validators";
import { getStoreModel } from "@/lib/db/models/store.model";

type LeanedUser = Omit<IUser, "stores"> & {
  stores?: {
    storeId: {
      _id: mongoose.Types.ObjectId;
      name: string;
      status: StoreStatusEnum;
    };
  }[];
};

/**
 * @module userRouter
 * @description
 * Handles user-related operations such as fetching user data by ID or email,
 * and updating user profiles. Each procedure includes input validation,
 * authentication checks, and error handling to ensure robust communication
 * between client and server.
 */
export const userRouter = createTRPCRouter({
  /**
   * @procedure getById
   * @description
   * Fetches a user’s public profile data using the authenticated user ID
   * stored in the request context. Ensures the user is authenticated before
   * performing the query. Returns a serialized user object or an error if not found.
   */
  getById: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user: userTokenData } = ctx;

      if (!userTokenData || !userTokenData.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Unauthorized access",
          cause: "UserNotAuthenticated",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userTokenData.id))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid user ID format.",
        });

      const User = await getUserModel();
      await getStoreModel();

      const user = await User.findById(userTokenData.id)
        .populate({
          path: "stores.storeId",
          select: "_id name status",
        })
        .select(
          "_id firstName lastName otherNames email phoneNumber address cityOfResidence stateOfResidence postalCode isVerified stores"
        )
        .lean<LeanedUser>();

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with id ${userTokenData.id} not found.`,
          cause: "UserNotFound",
        });
      }

      const serializedUser = {
        _id: (user._id as unknown as mongoose.Types.ObjectId).toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        otherNames: user.otherNames,
        email: user.email,
        phoneNumber: user.phoneNumber,
        address: user.address,
        cityOfResidence: user.cityOfResidence,
        stateOfResidence: user.stateOfResidence,
        postalCode: user.postalCode,
        isVerified: user.isVerified,
        stores: user.stores?.map((store) => ({
          storeId: store.storeId._id.toString(),
          name: store.storeId.name,
          status: store.storeId.status,
        })),
      };

      return serializedUser;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      throw handleTRPCError(error, "Error fetching user by ID");
    }
  }),

  /**
   * @procedure getByEmail
   * @description
   * Retrieves a user document using their email address.
   * Returns a TRPC error if the user does not exist.
   */
  getByEmail: baseProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async (input) => {
      try {
        const { email } = input.input;

        const user = await getUserByEmail(email);

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `User with email ${email} not found.`,
            cause: "UserNotFound",
          });
        }

        return user as unknown as User;
      } catch (error) {
        console.error("Error fetching user by email:", error);
        throw handleTRPCError(error, "Failed to fetch user by email");
      }
    }),

  /**
   * @procedure updateProfile
   * @description
   * Updates the profile details of an authenticated user.
   * Ensures that all required fields are provided and validated using Zod.
   * Returns the updated user object upon success.
   */
  updateProfile: baseProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phoneNumber: z.string().min(1),
        email: z.string().email(),
        address: z.string().min(1),
        cityOfResidence: z.string().min(1),
        stateOfResidence: z.string().min(1),
        postalCode: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { user } = ctx;

        if (!user || !user.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
          });
        }

        const User = await getUserModel();

        const updatedUser = await User.findByIdAndUpdate(
          user.id,
          {
            $set: {
              firstName: input.firstName,
              lastName: input.lastName,
              phoneNumber: input.phoneNumber,
              email: input.email.toLowerCase(),
              address: input.address,
              cityOfResidence: input.cityOfResidence,
              stateOfResidence: input.stateOfResidence,
              postalCode: input.postalCode,
            },
          },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        return {
          message: "User updated successfully",
          user: {
            ...updatedUser,
            _id: (
              updatedUser._id as unknown as mongoose.Types.ObjectId
            ).toString(),
          },
        };
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw handleTRPCError(error, "Failed to update user profile");
      }
    }),
});

import { z } from "zod";

import { getUserByEmail, getUserModel } from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { User } from "@/types";
import mongoose from "mongoose";

export const userRouter = createTRPCRouter({
  getById: baseProcedure.query(async ({ ctx }) => {
    const { user: userTokenData } = ctx;

    if (!userTokenData || !userTokenData.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized access",
        cause: "UserNotAuthenticated",
      });
    }
    const User = await getUserModel();

    const user = await User.findById(userTokenData.id)
      .select(
        "_id firstName lastName otherNames email phoneNumber address cityOfResidence stateOfResidence postalCode isVerified stores"
      )
      .lean();

    // console.log("Fetched user:", user);

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
      stores: user.stores,
    };
    return serializedUser;
  }),

  getByEmail: baseProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async (input) => {
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
    }),

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
            _id: (updatedUser._id as mongoose.Types.ObjectId).toString(),
          },
        };
      } catch (error: any) {
        console.error("Update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Internal server error",
        });
      }
    }),
});

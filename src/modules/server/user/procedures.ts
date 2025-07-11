import { z } from "zod";

import { getUserByEmail, getUserModel } from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { User } from "@/types";
import mongoose from "mongoose";

export const userRouter = createTRPCRouter({
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async (input) => {
      const { id } = input.input;
      const User = await getUserModel();

      const user = await User.findById(id)
        .select(
          "_id firstName lastName otherNames email phoneNumber address cityOfResidence stateOfResidence postalCode isVerified stores"
        )
        .lean();

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with id ${id} not found.`,
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
});

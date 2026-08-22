import { z } from "zod";
import {
  getUserByEmail,
  getUserModel,
  IUser,
  IUserDocument,
} from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { User } from "@/types";
import mongoose from "mongoose";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { editProfileValidation } from "@/validators/user-signUp-info-validation";
import { QueryBuilderFactory } from "@/domain/queries/query-builder-factory";
import { UserFactory } from "@/domain/users/user-factory";
import { sendTelegramMessage } from "@/lib/utils/telegram/send-message";
import {
  formatErrorReport,
  isReportableError,
} from "@/lib/utils/telegram/format-error-report";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { StoreFactory } from "@/domain/stores/store-factory";

/**
 * @module userRouter
 * @description
 * Handles user-related operations such as fetching user data by ID or email,
 * and updating user profiles.
 */
export const userRouter = createTRPCRouter({
  /**
   * @procedure getById
   * @description
   * Fetches a user’s public profile data using the authenticated user ID
   * stored in the request context.
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
      const StoreModel = await getStoreModel();

      const userDoc = await QueryBuilderFactory.queryBuilder<
        IUser,
        IUserDocument
      >(User)
        .where("_id", new mongoose.Types.ObjectId(userTokenData.id))
        .executeOne();

      if (!userDoc) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with id ${userTokenData.id} not found.`,
          cause: "UserNotFound",
        });
      }

      const storeIds = (userDoc.stores ?? []).map((s) => s.storeId);

      const stores =
        storeIds.length > 0
          ? await QueryBuilderFactory.queryBuilder<IStore>(StoreModel)
              .whereIn("_id", storeIds)
              .select("name", "status")
              .execute()
          : [];

      const user = UserFactory.createBaseUser(userDoc).toJSON();

      const userStoreSummary = stores.map((s) =>
        StoreFactory.buildSummary(s).toPublicJSON(),
      );

      return { user, userStoreSummary };
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, { source: "trpc:user.getById" }),
          );
        } catch {
          // sendTelegramMessage already console.errors; never mask the original error
        }
      }
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
      }),
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
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:user.getByEmail" }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(error, "Failed to fetch user by email");
      }
    }),

  /**
   * @procedure acceptTerms
   * @description
   * Records that the signed-in user accepted the terms and privacy policy.
   *
   * Takes no input. There is nothing for the client to supply: the identity
   * comes from the session and the timestamp is taken here, so neither can be
   * chosen by whoever calls it.
   *
   * Idempotent — re-accepting keeps the original date rather than refreshing
   * it, because the date's whole purpose is to record which version of the
   * terms was agreed to.
   */
  acceptTerms: baseProcedure.mutation(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to accept the terms.",
        });
      }

      const User = await getUserModel();

      const result = await User.updateOne(
        // The filter is the guard: a document that already has agreement
        // recorded does not match, so the timestamp cannot be overwritten by a
        // second call.
        {
          _id: new mongoose.Types.ObjectId(user.id),
          "termsAgreement.hasAgreed": { $ne: true },
        },
        {
          $set: {
            termsAgreement: { hasAgreed: true, agreedToTermsAt: new Date() },
          },
        },
      );

      return { success: true, alreadyAgreed: result.matchedCount === 0 };
    } catch (error) {
      if (isReportableError(error)) {
        try {
          await sendTelegramMessage(
            formatErrorReport(error, { source: "trpc:user.acceptTerms" }),
          );
        } catch {
          // sendTelegramMessage already console.errors; never mask the original
        }
      }
      throw handleTRPCError(error, "We couldn't record your agreement.");
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
    .input(editProfileValidation)
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

        const dbUser = await User.findById(user.id);

        if (!dbUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User Not Found",
          });
        }

        const normalizedInputEmail = input.email.toLowerCase();
        const existingUser = await User.findOne({
          email: normalizedInputEmail,
        });

        if (existingUser && existingUser._id.toString() !== user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email already in use",
          });
        }

        const isUpdated = dbUser.email.toLowerCase() !== normalizedInputEmail;

        // update fields
        dbUser.firstName = input.firstName;
        dbUser.lastName = input.lastName;
        dbUser.phoneNumber = input.phoneNumber;
        dbUser.email = normalizedInputEmail;
        dbUser.address = input.address;
        dbUser.cityOfResidence = input.cityOfResidence;
        dbUser.stateOfResidence = input.stateOfResidence;
        // Empty string means "cleared" — store undefined so the field is simply
        // absent rather than an empty value the UI would have to special-case.
        dbUser.institution = input.institution?.trim() || undefined;
        dbUser.isVerified = !isUpdated;

        await dbUser.save();

        return {
          message: "User updated successfully",
        };
      } catch (error) {
        console.error("Error updating user profile:", error);
        if (isReportableError(error)) {
          try {
            await sendTelegramMessage(
              formatErrorReport(error, { source: "trpc:user.updateProfile" }),
            );
          } catch {
            // sendTelegramMessage already console.errors; never mask the original error
          }
        }
        throw handleTRPCError(error, "Failed to update user profile");
      }
    }),
});

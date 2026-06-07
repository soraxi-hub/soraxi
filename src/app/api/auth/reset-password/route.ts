import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getOTPModel } from "@/lib/db/models/otp.model";
import { PasswordService } from "@/lib/utils";
import { OTP } from "@/lib/utils/otp";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { OtpEntityType, OtpPurpose } from "@/enums";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const { token, newPassword, ref } = requestBody as {
    token: string;
    newPassword: string;
    ref: "user" | "store" | null;
  };

  try {
    connectToDatabase();
    const otpUtils = new OTP();

    if (ref === "user") {
      const User = await getUserModel();
      const OTPModel = await getOTPModel();

      const otpDocs = await OTPModel.find({
        purpose: OtpPurpose.ResetPassword,
        entityType: OtpEntityType.User,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      let matchedOTP = null;

      for (const otp of otpDocs) {
        const isMatch = await PasswordService.validatePassword(
          token,
          otp.otpHash,
        );
        if (isMatch) {
          matchedOTP = otp;
          break;
        }
      }

      if (!matchedOTP) {
        throw new AppError("Invalid or Expired token", 401);
      }

      const user = await User.findById(matchedOTP.entityId).select("password");

      if (!user) {
        throw new AppError("Invalid or Expired token", 401);
      }

      // Optional: brute-force protection
      if (otpUtils.hasExceededAttempts(matchedOTP.attempts, null)) {
        throw new AppError("Too many attempts. Try again later.", 429);
      }

      const hashedPassword = await PasswordService.hashPassword(newPassword);

      user.password = hashedPassword;
      matchedOTP.isUsed = true;

      await Promise.all([user.save(), matchedOTP.save()]);

      return NextResponse.json(
        { message: "Password reset successful" },
        { status: 200 },
      );
    }

    if (ref === "store") {
      const Store = await getStoreModel();
      const OTPModel = await getOTPModel();

      const otpDocs = await OTPModel.find({
        purpose: OtpPurpose.ResetPassword,
        entityType: OtpEntityType.Store,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      let matchedOTP = null;

      for (const otp of otpDocs) {
        const isMatch = await PasswordService.validatePassword(
          token,
          otp.otpHash,
        );
        if (isMatch) {
          matchedOTP = otp;
          break;
        }
      }

      if (!matchedOTP) {
        throw new AppError("Invalid or Expired token", 401);
      }

      const store = await Store.findById(matchedOTP.entityId).select(
        "password",
      );

      if (!store) {
        throw new AppError("Invalid or Expired token", 401);
      }

      // Optional: brute-force protection
      if (otpUtils.hasExceededAttempts(matchedOTP.attempts, null)) {
        throw new AppError("Too many attempts. Try again later.", 429);
      }

      const hashedPassword = await PasswordService.hashPassword(newPassword);

      store.password = hashedPassword;
      matchedOTP.isUsed = true;

      await Promise.all([store.save(), matchedOTP.save()]);

      return NextResponse.json(
        { message: `Password reset successful` },
        { status: 200 },
      );
    }
  } catch (error: any) {
    throw handleApiError(error);
  }
}

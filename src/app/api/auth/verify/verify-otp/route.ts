import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { getOTPModel } from "@/lib/db/models/otp.model";
import { OTP } from "@/lib/utils/otp";
import { PasswordService } from "@/lib/utils";
import { OtpPurpose } from "@/enums";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError("UNAUTHORIZED", "Login required");
    }

    const { token } = await request.json();
    const userId = userData.id;

    const User = await getUserModel();
    const OTPModel = await getOTPModel();
    const otpUtils = new OTP();

    const user = await User.findById(userId).select("email isVerified");

    if (!user) {
      throw new AppError("NOT_FOUND", "User not found");
    }

    const otpDoc = await OTPModel.findOne({
      entityId: userId,
      identifier: user.email,
      purpose: OtpPurpose.VerifyEmail,
      isUsed: false,
    });

    if (!otpDoc) {
      throw new AppError("NOT_FOUND", "OTP not found or already used");
    }

    if (otpUtils.isOTPExpired(otpDoc.expiresAt)) {
      throw new AppError("BAD_REQUEST", "OTP has expired");
    }

    if (otpDoc.blockedUntil && new Date() < otpDoc.blockedUntil) {
      throw new AppError(
        "TOO_MANY_REQUESTS",
        "Too many failed attempts. Try again later",
      );
    }

    const isValid = await PasswordService.validatePassword(
      token.toString(),
      otpDoc.otpHash,
    );

    if (!isValid) {
      otpDoc.attempts += 1;

      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        otpDoc.blockedUntil = new Date(
          Date.now() + otpUtils.OTP_CONFIG.ATTEMPT_RESET_MINUTES * 60 * 1000,
        );
      }

      await otpDoc.save();

      throw new AppError("UNAUTHORIZED", "Invalid OTP");
    }

    otpDoc.isUsed = true;
    await otpDoc.save();

    if (
      user.otpRequestBlockedUntil &&
      new Date() >= user.otpRequestBlockedUntil
    ) {
      user.otpRequestBlockedUntil = undefined;
    }

    user.isVerified = true;
    await user.save();

    return NextResponse.json(
      { message: "Email verified successfully" },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

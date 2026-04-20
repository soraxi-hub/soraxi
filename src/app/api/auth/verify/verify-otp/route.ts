import { NextRequest, NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { getOTPModel, OtpPurpose } from "@/lib/db/models/otp.model";
import { OTP } from "@/lib/utils/otp";
import { PasswordService } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const userData = getUserDataFromToken(request);
    if (!userData) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED", "Login required");
    }

    const { token } = await request.json();
    const userId = userData.id;

    const User = await getUserModel();
    const OTPModel = await getOTPModel();
    const otpUtils = new OTP();

    const user = await User.findById(userId).select("email isVerified");

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Get active OTP
    const otpDoc = await OTPModel.findOne({
      entityId: userId,
      identifier: user.email,
      purpose: OtpPurpose.VerifyEmail,
      isUsed: false,
    });

    if (!otpDoc) {
      throw new AppError("OTP not found or already used", 404);
    }

    // Check if OTP is expired
    if (otpUtils.isOTPExpired(otpDoc.expiresAt)) {
      throw new AppError("OTP has expired", 400);
    }

    // Check if blocked
    if (otpDoc.blockedUntil && new Date() < otpDoc.blockedUntil) {
      throw new AppError("Too many failed attempts. Try again later", 429);
    }

    // Compare hashed OTP
    const isValid = await PasswordService.validatePassword(
      token.toString(),
      otpDoc.otpHash,
    );

    if (!isValid) {
      console.log("isValid", isValid);
      otpDoc.attempts += 1;

      // If exceeded max attempts → block
      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        otpDoc.blockedUntil = new Date(
          Date.now() + otpUtils.OTP_CONFIG.ATTEMPT_RESET_MINUTES * 60 * 1000,
        );
      }

      await otpDoc.save();

      throw new AppError("Invalid OTP", 401);
    }

    // OTP is valid → mark as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    if (
      user.otpRequestBlockedUntil &&
      new Date() >= user.otpRequestBlockedUntil
    ) {
      user.otpRequestBlockedUntil = undefined;
    }

    // Verify user
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

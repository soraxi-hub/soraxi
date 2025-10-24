import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { siteConfig } from "@/config/site";
import { NotificationFactory, renderTemplate } from "@/domain/notification";
import { OTPVerificationEmail } from "@/domain/notification";
import React from "react";
import { generateSecureOTP, getOTPExpiry } from "@/lib/utils/otp";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getUserDataFromToken(request);
    if (!userData) {
      throw new AppError(
        "Unauthorized",
        401,
        "You must be logged in to perform this action",
        "user not logged in"
      );
    }

    const data = await saveOTPToDatabase(userData.id);

    // Render OTP verification email template
    const html = await renderTemplate(
      React.createElement(OTPVerificationEmail, {
        userName: data.userName,
        otpCode: data.otpCode,
        expiryMinutes: 15,
      })
    );

    // Create plain text version for fallback
    const text = EmailTextTemplates.generateOTPText(data);

    // Send email using NotificationFactory
    const notification = NotificationFactory.create("email", {
      recipient: data.userEmail,
      subject: `Complete your sign up – Verify your email for ${siteConfig.name}`,
      emailType: "emailVerification",
      fromAddress: "noreply@soraxihub.com",
      html: html,
      text: text,
      // metadata: {
      //   userId: data.userId,
      //   otpCode: data.otpCode,
      //   purpose: "email_verification",
      // },
    });

    await notification.send();

    return NextResponse.json(
      {
        message: "Verification email sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

async function saveOTPToDatabase(userId: string) {
  // <CHANGE> Use secure OTP generation and remove duplicate DB connection
  const token = generateSecureOTP();
  const expiryDate = getOTPExpiry();
  const User = await getUserModel();

  const user = await User.findByIdAndUpdate(
    userId,
    {
      verifyToken: token,
      verifyTokenExpiry: expiryDate,
      lastOtpRequestAt: new Date(),
      otpAttempts: 0, // Reset attempts on new OTP
    },
    { new: true }
  );

  if (!user) {
    throw new AppError(
      "User Not Found",
      404,
      "User not found in the database",
      "user not found"
    );
  }

  return {
    otpCode: token,
    expiry: expiryDate,
    userName: `${user.firstName} ${user.lastName}`,
    userEmail: user.email,
    userId: user._id,
  };
}

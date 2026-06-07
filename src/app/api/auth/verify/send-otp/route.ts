import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserDataFromToken } from "@/lib/helpers/get-user-data-from-token";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { siteConfig } from "@/config/site";
import { NotificationFactory, renderTemplate } from "@/domain/notification";
import { OTPVerificationEmail } from "@/domain/notification";
import React from "react";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";
import { OTP } from "@/lib/utils/otp";
import { OtpPurpose } from "@/enums";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getUserDataFromToken(request);
    const otp = new OTP();

    if (!userData) {
      throw new AppError(
        "Unauthorized",
        401,
        "You must be logged in to perform this action",
        "user not logged in",
      );
    }

    const data = await otp.createEmailVerificationOTP(
      userData.id,
      OtpPurpose.VerifyEmail,
    );

    if (!data.success || data.data === null) {
      throw new AppError(data.message, 429, "", data.message);
    }

    const { userName, otpCode, userEmail } = data.data;

    // Render OTP verification email template
    const html = await renderTemplate(
      React.createElement(OTPVerificationEmail, {
        userName: userName,
        otpCode: otpCode,
        expiryMinutes: 15,
      }),
    );

    // Create plain text version for fallback
    const text = EmailTextTemplates.generateOTPText(data.data);

    // Send email using NotificationFactory
    const notification = NotificationFactory.create("email", {
      recipient: userEmail,
      subject: `Complete your sign up – Verify your email for ${siteConfig.name}`,
      emailType: "emailVerification",
      fromAddress: "noreply@soraxihub.com",
      html: html,
      text: text,
    });

    await notification.send();

    return NextResponse.json(
      {
        message: "Verification email sent successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

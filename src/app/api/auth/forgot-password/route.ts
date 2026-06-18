import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { AppError } from "@/lib/errors/app-error";
import { siteConfig } from "@/config/site";
import { handleApiError } from "@/lib/utils/handle-api-error";
import {
  NotificationFactory,
  renderTemplate,
  PasswordResetEmail,
} from "@/domain/notification";
import React from "react";
import { OTP } from "@/lib/utils/otp";
import { OtpPurpose } from "@/enums";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const { email, ref } = requestBody as {
    email: string;
    ref: "user" | "store";
  };

  try {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new AppError(
        "INTERNAL_SERVER_ERROR",
        "Server configuration error: Missing required NEXT_PUBLIC_APP_URL environment variables",
      );
    }

    await connectToDatabase();
    const otpUtils = new OTP();

    if (ref === "user") {
      const data = await otpUtils.createPasswordResetTokenForUsers(
        email,
        OtpPurpose.ResetPassword,
      );

      if (!data.success || data.data === null) {
        throw new AppError("BAD_REQUEST", data.message, {
          details: data.message,
        });
      }

      const { resetToken, expiry: expiryMinutes } = data.data;
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&ref=${ref}`;

      const subject = `${siteConfig.name} Password Reset Request`;

      const html = await renderTemplate(
        React.createElement(PasswordResetEmail, {
          resetUrl,
          expiryMinutes,
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: email,
        subject,
        emailType: "passwordReset",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `Password reset link: ${resetUrl}`,
      });

      await notification.send();
    }

    if (ref === "store") {
      const data = await otpUtils.createPasswordResetTokenForStores(
        email,
        OtpPurpose.ResetPassword,
      );

      if (!data.success || data.data === null) {
        throw new AppError("BAD_REQUEST", data.message, {
          details: data.message,
        });
      }

      const { resetToken, expiry: expiryMinutes } = data.data;
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&ref=${ref}`;

      const subject = `${siteConfig.name} Store Password Reset Request`;

      const html = await renderTemplate(
        React.createElement(PasswordResetEmail, {
          resetUrl,
          expiryMinutes,
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: email,
        subject,
        emailType: "passwordReset",
        fromAddress: "noreply@soraxihub.com",
        html,
        text: `Password reset link: ${resetUrl}`,
      });

      await notification.send();
    }

    return NextResponse.json({ message: "Reset email sent" }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

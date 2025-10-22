import { type NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { siteConfig } from "@/config/site";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleApiError } from "@/lib/utils/handle-api-error";
import {
  NotificationFactory,
  renderTemplate,
  PasswordResetEmail,
} from "@/domain/notification";
import React from "react";

const generateResetToken = () => {
  return uuidv4({
    random: randomBytes(16),
  });
};

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const { email, ref } = requestBody as {
    email: string;
    ref: "user" | "store";
  };

  try {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error("Missing required environment variables");
      return NextResponse.json(
        {
          error:
            "Server configuration error: Missing required NEXT_PUBLIC_APP_URL environment variables",
        },
        { status: 500 }
      );
    }

    // Establish database connection
    await connectToDatabase();

    if (ref === "user") {
      const User = await getUserModel();
      const user = await User.findOne({ email });
      if (!user) {
        throw new AppError(
          "User not found",
          404,
          "Make sure you provide the right Email",
          "User not found"
        );
      }

      // Generate reset token and URL
      const resetToken = generateResetToken();
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&ref=${ref}`;

      // Update user document with token and expiry
      user.forgotpasswordToken = resetToken;
      user.forgotpasswordTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes expiry
      await user.save();

      const subject = `${siteConfig.name} Password Reset Request`;

      // Render React Email template to HTML
      const html = await renderTemplate(
        React.createElement(PasswordResetEmail, { resetUrl, expiryMinutes: 15 })
      );

      // Create and send email notification using factory
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
      const Store = await getStoreModel();
      const store = await Store.findOne({ email });
      if (!store) {
        throw new AppError(
          "Store not found",
          404,
          "Make sure you provide the right Email",
          "Store not found"
        );
      }

      const resetToken = generateResetToken();
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&ref=${ref}`;

      store.forgotpasswordToken = resetToken;
      store.forgotpasswordTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes expiry
      await store.save();

      const subject = `${siteConfig.name} Store Password Reset Request`;

      // Render React Email template to HTML
      const html = await renderTemplate(
        React.createElement(PasswordResetEmail, { resetUrl, expiryMinutes: 15 })
      );

      // Create and send email notification using factory
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

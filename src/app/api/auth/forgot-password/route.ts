import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";
import { connectToDatabase } from "@/lib/db/mongoose";
import { sendMail } from "@/services/mail.service";
import { getUserModel } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { siteConfig } from "@/config/site";
import { getStoreModel } from "@/lib/db/models/store.model";
import { handleApiError } from "@/lib/utils/handle-api-error";

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
    // Establish database connection
    await connectToDatabase();

    // Validate email existence in appropriate collection
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
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&ref=${ref}`; // Fixed parameter separator

      // Update user document with token and expiry
      user.forgotpasswordToken = resetToken;
      user.forgotpasswordTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes expiry
      await user.save();

      const subject = `${siteConfig.name} Password Reset Request`;

      const text = `${siteConfig.name} Password Reset\n--------------------------\n
You're receiving this because you requested a password reset for your User account.\n
Please click the following link to reset your password:\n
${resetUrl}\n
This link will expire in 15 minutes.\n
If you didn't request this, please ignore this email.`;

      const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset Request</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        padding: 20px;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        padding: 30px;
      }
      .header {
        background-color: #14a800;
        padding: 20px;
        text-align: center;
        border-radius: 6px 6px 0 0;
        color: white;
        font-size: 22px;
        font-weight: bold;
      }
      .content {
        margin-top: 20px;
        line-height: 1.6;
      }
      .button {
        display: inline-block;
        margin: 20px 0;
        padding: 12px 24px;
        background-color: #14a800;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      }
      .code {
        word-break: break-all;
        background: #f1f1f1;
        padding: 10px;
        border-radius: 4px;
        display: block;
        font-family: monospace;
        font-size: 14px;
        margin-top: 10px;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #777;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">${siteConfig.name} Password Reset Request</div>
      <div class="content">
        <p>You're receiving this because you requested a password reset for your <strong>User Account</strong>.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>This link will expire in <strong>15 minutes</strong>.</p>
        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <code class="code">${resetUrl}</code>
      </div>
      <div class="footer">
        If you didn't request this password reset, you can safely ignore this email.<br/>
        &copy; ${new Date().getFullYear()} ${
        siteConfig.name
      }. All rights reserved.
      </div>
    </div>
  </body>
</html>
`;

      // Send password reset email
      await sendMail({
        email: email,
        emailType: "passwordReset",
        userId: user._id.toString(),
        subject: subject,
        html: html,
        text: text,
      });
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
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}&ref=${ref}`; // Fixed parameter separator

      store.forgotpasswordToken = resetToken;
      store.forgotpasswordTokenExpiry = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes expiry
      await store.save();

      const subject = `${siteConfig.name} Store Password Reset Request`;

      const text = `${siteConfig.name} Store Password Reset\n--------------------------\n
You're receiving this because you requested a password reset for your Store account.\n
Please click the following link to reset your password:\n
${resetUrl}\n
This link will expire in 15 minutes.\n
If you didn't request this, please ignore this email.`;

      const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Password Reset</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f9f9f9;
        padding: 20px;
        color: #333;
      }
      .container {
        max-width: 600px;
        margin: auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        padding: 30px;
      }
      .header {
        background-color: #14a800;
        padding: 20px;
        text-align: center;
        border-radius: 6px 6px 0 0;
        color: white;
        font-size: 22px;
        font-weight: bold;
      }
      .content {
        margin-top: 20px;
        line-height: 1.6;
      }
      .button {
        display: inline-block;
        margin: 20px 0;
        padding: 12px 24px;
        background-color: #14a800;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
      }
      .code {
        word-break: break-all;
        background: #f1f1f1;
        padding: 10px;
        border-radius: 4px;
        display: block;
        font-family: monospace;
        font-size: 14px;
      }
      .footer {
        margin-top: 30px;
        font-size: 12px;
        color: #777;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">${siteConfig.name} Store Password Reset</div>
      <div class="content">
        <p>You're receiving this because you requested a password reset for your <strong>Store Account</strong>.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>This link will expire in <strong>15 minutes</strong>.</p>
        <p>If the button doesn’t work, copy and paste this link into your browser:</p>
        <code class="code">${resetUrl}</code>
      </div>
      <div class="footer">
        If you didn't request this password reset, you can safely ignore this email.<br/>
        &copy; ${new Date().getFullYear()} ${
        siteConfig.name
      }. All rights reserved.
      </div>
    </div>
  </body>
</html>
`;

      await sendMail({
        email: email,
        emailType: "passwordReset",
        userId: undefined,
        subject: subject,
        html: html,
        text: text,
      });
    }

    return NextResponse.json({ message: "Reset email sent" }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

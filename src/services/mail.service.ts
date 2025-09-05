import nodemailer from "nodemailer";
import { getUserModel } from "../lib/db/models/user.model";
import { siteConfig } from "@/config/site";
import { connectToDatabase } from "../lib/db/mongoose";
import { handleApiError } from "../lib/utils/handle-api-error";

type EmailTypes =
  | "emailVerification"
  | "passwordReset"
  | "orderConfirmation"
  | "storeOrderNotification"
  | "supportNotification"
  | "noreply";

type FromAddress =
  | "support@soraxihub.com"
  | "noreply@soraxihub.com"
  | "info@soraxihub.com"
  | "orders@soraxihub.com"
  | "admin@soraxihub.com";

type SendMail = {
  email: string;
  emailType: EmailTypes;
  fromAddress: FromAddress;
  subject: string;
  userId?: string;
  html?: string;
  text?: string;
};

// Define SMTP credentials for each domain email
const emailAccounts = {
  noreply: {
    user: process.env.SORAXI_NOREPLY_EMAIL,
    pass: process.env.SORAXI_NOREPLY_APP_PASSWORD,
  },
  admin: {
    user: process.env.SORAXI_ADMIN_EMAIL,
    pass: process.env.SORAXI_ADMIN_APP_PASSWORD,
  },
};

// Function to create transporter dynamically
const createTransporter = (
  emailType: keyof typeof emailAccounts | EmailTypes
) => {
  let select: "noreply" | "admin";

  switch (emailType) {
    case "admin":
    case "supportNotification":
    case "orderConfirmation":
    case "storeOrderNotification":
      select = "admin";
      break;
    case "noreply":
    case "passwordReset":
    case "emailVerification":
      select = "noreply";
      break;
    default:
      select = "admin";
      break;
  }
  const account = emailAccounts[select];

  return nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });
};

export const sendMail = async ({
  email,
  emailType,
  fromAddress,
  userId,
  subject,
  html,
  text,
}: SendMail) => {
  await connectToDatabase();
  const User = await getUserModel();

  try {
    let finalSubject = subject || "";
    let finalHtml = html || "";
    const finalText = text || "";
    const transporter = createTransporter(emailType);

    if (emailType === "emailVerification") {
      if (!userId) throw new Error("User ID required for email verification");

      const token = Math.floor(100000 + Math.random() * 900000);
      await User.findByIdAndUpdate(userId, {
        verifyToken: token,
        verifyTokenExpiry: Date.now() + 1000 * 60 * 15, // 15 mins
      });

      finalSubject = "ACCOUNT VERIFICATION";
      finalHtml = generateVerificationHtml(token);
    }

    if (!finalHtml && !finalText) {
      throw new Error("Email body (HTML or text) must be provided.");
    }

    if (emailType === "storeOrderNotification" && html) {
      finalHtml = html;
    }

    if (emailType === "supportNotification" && html) {
      finalHtml = html;
    }

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: finalSubject,
      text: finalText || undefined,
      html: finalHtml || undefined,
    };

    const mailResponse = await transporter.sendMail(mailOptions);
    return mailResponse;
  } catch (error) {
    console.error("Error sending email:", error);
    throw handleApiError(error);
  }
};

export function wrapWithBrandedTemplate({
  title,
  bodyContent,
}: {
  title: string;
  bodyContent: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${title}</title>
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
          <div class="header">
            <h1>${siteConfig.name}</h1>
          </div>
          <main>
            ${bodyContent}
          </main>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${
    siteConfig.name
  }. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateVerificationHtml(token: number): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Account Verification</title>
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
        }
        .otp {
          font-size: 24px;
          font-weight: bold;
          color: #14a800;
          margin: 20px 0;
          text-align: center;
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
        <div class="header">
          <h1>Welcome to ${siteConfig.name}</h1>
        </div>
        <main>
          <p>Someone has created an account on <strong>${
            siteConfig.name
          }</strong> using this email address.</p>
          <p>If it was you, please enter the following One-Time Password (OTP):</p>
          <div class="otp">${token}</div>
          <p>This OTP is valid for <strong>15 minutes</strong>.</p>
          <p>If you did not create this account, you can safely ignore this message.</p>
        </main>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${
    siteConfig.name
  }. All rights reserved.
        </div>
      </div>
    </body>
  </html>`;
}

export function generateOrderStatusHtml({
  status,
  orderId,
  subOrderId,
  storeName,
}: {
  status: string;
  orderId: string;
  subOrderId: string;
  storeName?: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f9f9f9;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .status {
            font-size: 20px;
            font-weight: bold;
            color: #14a800;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Update from ${storeName || "Our Store"}</h2>
          <p>Your order <strong>${subOrderId}</strong> has been updated.</p>
          <p class="status">Status: ${status}</p>
          <p>You can log in to your account to view more details.</p>
          <p>Order ID: ${orderId}</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </body>
    </html>
  `;
}

export function generateStoreOwnerConfirmationHtml(
  storeName: string,
  ownerName?: string
): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Store Onboarding Submitted</title>
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
        <div class="header">
          <h1>Welcome to ${siteConfig.name}</h1>
        </div>
        <main>
          <p>Hi ${ownerName || "there"},</p>
          <p>Thank you for completing your store onboarding on <strong>${
            siteConfig.name
          }</strong>.</p>
          <p>Your store <strong>${storeName}</strong> has been successfully submitted for admin review.</p>
          <p>You will be notified once a decision is made.</p>
          <p>In the meantime, you can update your store profile or check your dashboard for more actions.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>${siteConfig.name} Team</strong></p>
        </main>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${
    siteConfig.name
  }. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `;
}

export function generateAdminNotificationHtml({
  storeName,
  ownerEmail,
  submittedAt,
}: {
  storeName: string;
  ownerEmail: string;
  submittedAt: Date;
}): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>New Store Submitted</title>
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
        }
        .details {
          margin-top: 20px;
        }
        .details p {
          margin: 6px 0;
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
        <div class="header">
          <h1>New Store Submitted</h1>
        </div>
        <main>
          <p>A new store has been submitted for review on <strong>${
            siteConfig.name
          }</strong>.</p>
          <div class="details">
            <p><strong>Store Name:</strong> ${storeName}</p>
            <p><strong>Owner Email:</strong> ${ownerEmail}</p>
            <p><strong>Submitted At:</strong> ${submittedAt.toLocaleString()}</p>
          </div>
          <p>Please log in to the admin dashboard to review and approve the submission.</p>
        </main>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${
    siteConfig.name
  }. All rights reserved.
        </div>
      </div>
    </body>
  </html>
  `;
}

export function generateAdminOrderFailureHtml({
  deliveryStatus,
  orderId,
  subOrderId,
  storeName,
  reason,
  customerEmail,
}: {
  deliveryStatus: string;
  orderId: string;
  subOrderId: string;
  storeName: string;
  reason?: string;
  customerEmail: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #14a800;
          color: white;
          padding: 15px;
          border-radius: 6px 6px 0 0;
          text-align: center;
        }
        .section {
          margin: 20px 0;
        }
        .label {
          font-weight: bold;
        }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          text-align: center;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>⚠️ Order Alert: ${deliveryStatus}</h2>
        </div>
        <div class="section">
          <p><span class="label">Order ID:</span> ${orderId}</p>
          <p><span class="label">Sub Order ID:</span> ${subOrderId}</p>
          <p><span class="label">Store:</span> ${storeName}</p>
          <p><span class="label">Customer Email:</span> ${customerEmail}</p>
          ${
            reason
              ? `<p><span class="label">Reason Provided:</span> ${reason}</p>`
              : ""
          }
        </div>
        <div class="section">
          <p>Please review this case in the admin dashboard for any required follow-up action (e.g. refund, seller verification, etc.).</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${storeName}. Admin Notification System.
        </div>
      </div>
    </body>
    </html>
  `;
}

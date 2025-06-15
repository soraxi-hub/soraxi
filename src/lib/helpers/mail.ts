import nodemailer from "nodemailer";
import { getUserModel } from "../db/models/user.model";
import { siteConfig } from "@/config/site";
import { connectToDatabase } from "../db/mongoose";
import { handleApiError } from "../utils/handle-api-error";

type SendMail = {
  email: string;
  emailType: "emailVerification" | "passwordReset";
  userId: string;
};

export const sendMail = async ({ email, emailType, userId }: SendMail) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_MAIL_USERNAME,
      pass: process.env.NEXT_SECRET_APP_SPECIFIED_KEY,
    },
  });

  // connect to the database
  await connectToDatabase();
  const User = await getUserModel();
  //   const user = (await User.findOne({ email })) as IUser | null;

  try {
    // create a hased token
    const token = Math.floor(100000 + Math.random() * 900000);

    if (emailType === "emailVerification") {
      await User.findByIdAndUpdate(userId, {
        verifyToken: token,
        verifyTokenExpiry: Date.now() + 1000 * 60 * 15, // 15 minutes expiry
      });
    }

    const mailOptions = {
      from: process.env.ZOHO_MAIL_USERNAME, // sender address
      to: email, // list of receivers
      subject: `ACCOUNT VERIFICATION`, // Subject line
      text: "", // plain text body
      html: `
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
    </html>
  `,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    return mailResponse;
  } catch (error) {
    console.error(error);
    throw handleApiError(error);
    // throw new Error(`Error sending email: ${error.message}`);
  }
};

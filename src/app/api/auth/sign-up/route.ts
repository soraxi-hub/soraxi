import { connectToDatabase } from "@/lib/db/mongoose";
import { NextRequest, NextResponse } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { UserFactory } from "@/domain/users/user-factory";
import { UserRepository } from "@/repositories/user-repo";
import {
  NotificationFactory,
  renderTemplate,
  WelcomeEmail,
} from "@/domain/notification";
import React from "react";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";
import { siteConfig } from "@/config/site";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const {
    firstName,
    lastName,
    email,
    password,
    address,
    phoneNumber,
    cityOfResidence,
    stateOfResidence,
    postalCode,
  } = requestBody as {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    cityOfResidence: string;
    stateOfResidence: string;
    postalCode: string;
    isVerified: boolean;
  };

  try {
    const props = {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      address,
      cityOfResidence,
      stateOfResidence,
      postalCode,
      isVerified: false,
    };
    await connectToDatabase();

    const emailAlreadyExist = await UserRepository.isExistingUser(email);
    if (emailAlreadyExist) {
      throw new AppError("CONFLICT", "Email already exist");
    }

    const phoneNumberAlreadyExist =
      await UserRepository.isExistingPhoneNumber(phoneNumber);
    if (phoneNumberAlreadyExist) {
      throw new AppError("CONFLICT", "Phone Number already exist");
    }

    const user = UserFactory.createAuthUser(props);
    await user.hashPassword();
    await UserRepository.saveUser(user);

    try {
      const subject = `Welcome to ${siteConfig.name} — Let’s Get You Started`;
      const userName = `${user.firstName} ${user.lastName}`;
      const text = EmailTextTemplates.generateWelcomeEmailText(userName);

      const html = await renderTemplate(
        React.createElement(WelcomeEmail, {
          userName,
        }),
      );

      const notification = NotificationFactory.create("email", {
        recipient: user.email,
        subject,
        emailType: "noreply",
        fromAddress: "noreply@soraxihub.com",
        html,
        text,
      });

      await notification.send();
    } catch (error) {
      console.error(`Error sending welcome message: ${error}`);
    }

    return NextResponse.json(
      { message: `User created successfully`, success: true },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

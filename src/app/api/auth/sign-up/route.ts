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
    otherNames,
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
    otherNames: string;
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
      otherNames,
      phoneNumber,
      address,
      cityOfResidence,
      stateOfResidence,
      postalCode,
      isVerified: false,
    };
    await connectToDatabase();

    // Check if the user already exist
    const emailAlreadyExist = await UserRepository.isExistingUser(email);
    if (emailAlreadyExist) {
      throw new AppError("Email already exist", 401);
    }

    const phoneNumberAlreadyExist =
      await UserRepository.isExistingPhoneNumber(phoneNumber);
    if (phoneNumberAlreadyExist) {
      throw new AppError("Phone Number already exist", 401);
    }

    // If it gets to this point, then create the user because this is a new user
    const user = UserFactory.createPublicUser(props);

    // Always hash the password before saving the user to the Database
    await user.hashPassword();

    await UserRepository.saveUser(user);

    try {
      const subject = `Welcome to ${siteConfig.name} — Let’s Get You Started`;
      const userName = `${user.getFirstName()} ${user.getLastName()}`;
      const text = EmailTextTemplates.generateWelcomeEmailText(userName);

      // Render React Email template to HTML
      const html = await renderTemplate(
        React.createElement(WelcomeEmail, {
          userName,
        })
      );

      // Create and send email notification using factory
      const notification = NotificationFactory.create("email", {
        recipient: user.getEmail(),
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
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

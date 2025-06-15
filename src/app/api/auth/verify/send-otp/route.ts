import { NextRequest, NextResponse } from "next/server";

import { sendMail } from "@/lib/helpers/mail";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserById, IUser } from "@/lib/db/models/user.model";
import { getUserDataFromToken } from "@/lib/helpers/getUserDataFromToken";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

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

    const userId = userData.id;
    const user = (await getUserById(userId)) as IUser | null;

    if (!user) {
      throw new AppError(
        "User Not Found",
        404,
        "User not found in the database",
        "user not found"
      );
    }

    const userEmail = user.email;

    const response = await sendMail({
      email: userEmail,
      emailType: "emailVerification",
      userId: userId,
    });

    return NextResponse.json({ message: response }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

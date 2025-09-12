import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel, IUser } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

interface userData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  store?: string;
}

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  // console.log("requestBody", requestBody);
  const { email, password } = requestBody;

  try {
    await connectToDatabase();

    // Check if the user exist
    const User = await getUserModel();
    const user = (await User.findOne({ email }).select(
      "firstName lastName email password stores"
    )) as IUser | null;
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // check it password is correct
    const validatePassword = await bcryptjs.compare(password, user.password);

    if (!validatePassword) {
      throw new AppError("Invalid password", 401);
    }

    // create tokenData
    const tokenData: userData = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      store: user.stores?.[0] ? user.stores[0].storeId.toString() : undefined,
    };

    // One Day in seconds
    const oneDayInSeconds = 24 * 60 * 60;

    // create token
    const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY!, {
      expiresIn: oneDayInSeconds,
    });

    const response = NextResponse.json(
      { message: "Login successful", success: true, tokenData },
      { status: 200 }
    );

    const hostname = request.nextUrl.hostname;

    response.cookies.set("user", token, {
      httpOnly: true,
      maxAge: oneDayInSeconds,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

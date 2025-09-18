import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { connectToDatabase } from "@/lib/db/mongoose";
import { handleApiError } from "@/lib/utils/handle-api-error";
import { AuthService } from "@/services/auth.service";

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

    const user = await AuthService.userLogin(email, password);

    // create tokenData
    const tokenData: userData = {
      id: user.getId(),
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      email: user.getEmail(),
      store: user.getStore(),
    };

    // Two weeks in seconds
    const twoWeeksInSeconds = 2 * 7 * 24 * 60 * 60;

    // create token
    const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY!, {
      expiresIn: twoWeeksInSeconds,
    });

    const response = NextResponse.json(
      { message: "Login successful", success: true },
      { status: 200 }
    );

    const hostname = request.nextUrl.hostname;

    response.cookies.set("user", token, {
      httpOnly: true,
      maxAge: twoWeeksInSeconds,
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

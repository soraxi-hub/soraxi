import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectToDatabase } from "@/lib/db/mongoose";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/lib/db/models/user.model";
import { AppError } from "@/lib/errors/app-error";
import { handleApiError } from "@/lib/utils/handle-api-error";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    if (!session) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED", "Login required");
    }

    const { token } = await request.json();
    const userId = session.user._id;
    const user = await getUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const tokenIsValid =
      user.verifyToken === token &&
      Date.now() < new Date(user.verifyTokenExpiry!).getTime();

    if (!tokenIsValid) {
      throw new AppError("Invalid or expired token", 401);
    }

    user.isVerified = true;
    user.verifyToken = "";
    user.verifyTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: "Successful" }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { sendMail } from "@/lib/helpers/mail";
import { connectToDatabase } from "@/lib/db/mongoose";
import { authOptions } from "@/lib/auth";
import { TRPCError } from "@trpc/server";
import { getUserById, IUser } from "@/lib/db/models/user.model";

export async function POST(_request: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    if (!session) {
      throw new TRPCError({
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        cause: `You must be logged in to perform this action`,
      });
    }

    const userId = session.user._id;
    const user = (await getUserById(userId)) as IUser | null;

    if (!user) {
      throw new TRPCError({
        message: "User not found",
        code: "NOT_FOUND",
        cause: `User with ID ${userId} does not exist`,
      });
    }

    const userEmail = user.email;

    const response = await sendMail({
      email: userEmail,
      emailType: "emailVerification",
      userId: userId,
    });

    return NextResponse.json({ message: response }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    // throw new Error(`Error sending email`, error.message);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

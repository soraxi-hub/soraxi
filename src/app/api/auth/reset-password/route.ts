import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getUserModel } from "@/lib/db/models/user.model";
import { getStoreModel } from "@/lib/db/models/store.model";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const { token, newPassword, ref } = requestBody as {
    token: string;
    newPassword: string;
    ref: "user" | "store" | null;
  };

  try {
    connectToDatabase();

    if (ref === "user") {
      const User = await getUserModel();
      const user = await User.findOne({ forgotpasswordToken: token });

      if (!user) {
        return NextResponse.json(
          { message: `Invalid or Expired token` },
          { status: 401 }
        );
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(newPassword, salt);
      const savedToken = user.forgotpasswordToken;
      const tokenExpiry = user.forgotpasswordTokenExpiry
        ? new Date(user.forgotpasswordTokenExpiry).getTime()
        : 0;

      if (
        savedToken &&
        savedToken.toString() === token.toString() &&
        Date.now() < tokenExpiry
      ) {
        user.password = hashedPassword;
        user.forgotpasswordToken = undefined;
        user.forgotpasswordTokenExpiry = undefined;
        await user.save();
        return NextResponse.json(
          { message: `Password reset successful` },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: `Invalid or Expired token` },
          { status: 401 }
        );
      }
    }

    if (ref === "store") {
      const Store = await getStoreModel();
      const store = await Store.findOne({ forgotpasswordToken: token });

      if (!store) {
        return NextResponse.json(
          { message: `Invalid or Expired token` },
          { status: 401 }
        );
      }

      const salt = await bcryptjs.genSalt(10);
      const hashedPassword = await bcryptjs.hash(newPassword, salt);
      const savedToken = store.forgotpasswordToken;
      const tokenExpiry = store.forgotpasswordTokenExpiry
        ? new Date(store.forgotpasswordTokenExpiry).getTime()
        : 0;

      if (
        savedToken &&
        savedToken.toString() === token.toString() &&
        Date.now() < tokenExpiry
      ) {
        store.password = hashedPassword;
        store.forgotpasswordToken = undefined;
        store.forgotpasswordTokenExpiry = undefined;
        await store.save();
        return NextResponse.json(
          { message: `Password reset successful` },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          { message: `Invalid or Expired token` },
          { status: 401 }
        );
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
}

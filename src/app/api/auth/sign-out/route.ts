import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Remove cookies
  cookieStore.delete("user");
  cookieStore.delete("store");
  cookieStore.delete("admin");

  const response = NextResponse.json({ message: "Logged out successfully" });
  return response;
}

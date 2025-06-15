import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out successfully" });

  // Clear the cookie by setting it with maxAge: 0
  response.cookies.set("user", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });

  return response;
}

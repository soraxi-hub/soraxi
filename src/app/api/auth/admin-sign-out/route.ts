import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: "Logged out successfully" });

  const hostname = request.nextUrl.hostname;

  response.cookies.set("admin", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    domain: hostname.endsWith("soraxihub.com") ? ".soraxihub.com" : undefined,
  });

  return response;
}

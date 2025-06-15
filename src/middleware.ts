import { NextResponse, NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userToken = request.cookies.get("user")?.value;
  console.log("Middleware triggered for path:", pathname);
  //   console.log("User token:", userToken);

  const publicPaths = [
    "/",
    "/sign-in",
    "/sign-up",
    "/about-us",
    "/privacy-policy",
    "/shipping-return-policy",
    "/terms-conditions",
    "/cart",
    "/partner-with-udua",
    "/admin-sign-in",
  ];

  const isPublicPath = publicPaths.includes(pathname);

  // Authenticated users should not access sign-in or sign-up
  if (userToken && (pathname === "/sign-in" || pathname === "/sign-up")) {
    // console.log("Redirecting authenticated user from sign-in or sign-up page");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users trying to access protected routes
  if (!userToken && !isPublicPath) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Everything else is allowed
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/|favicon.ico|.*\\..*).*)"],
  //   runtime: "nodejs",
};

import { NextResponse, NextRequest } from "next/server";
import {
  getAdminPermissions,
  verifyAdminToken,
} from "./modules/admin/jwt-utils";
import { ROUTE_PERMISSIONS } from "./modules/admin/security/route-permissions";
import { hasPermission } from "./modules/admin/security/access-control";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userToken = request.cookies.get("user")?.value;
  const storeToken = request.cookies.get("store")?.value;
  const adminToken = request.cookies.get("adminToken")?.value;
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
    "/products/:path*",
    "/forgot-password",
    "/reset-password",
    "/store/onboarding",
  ];

  const isPublicPath = publicPaths.some((path) => {
    if (path.includes(":path*")) {
      const basePath = path.replace("/:path*", "");
      return pathname.startsWith(basePath);
    }
    return pathname === path;
  });

  // Check if the path is an admin path
  const isAdminPath =
    pathname.startsWith("/admin/") || ["/admin-sign-in"].includes(pathname);

  // Authenticated users should not access sign-in or sign-up
  if (userToken && (pathname === "/sign-in" || pathname === "/sign-up")) {
    // console.log("Redirecting authenticated user from sign-in or sign-up page");
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated users trying to access protected routes
  if (!userToken && !isPublicPath) {
    // Redirect to sign-in page with redirect parameter
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (storeToken && pathname === "/login") {
    // If your token payload includes storeId, extract and redirect dynamically
    return NextResponse.redirect(new URL(`/`, request.url));
  }

  /**
   * Determines if the current path is a protected store onboarding route.
   * Use this in your middleware condition alongside `isStorePath()`.
   */
  // Match only dynamic onboarding paths like /store/onboarding/:storeId/...
  const isProtectedStoreOnboardingPath =
    /^\/store\/onboarding\/[a-f\d]{24}(\/.*)?$/i.test(pathname);

  if (
    !storeToken &&
    (isStorePath(pathname) || isProtectedStoreOnboardingPath)
  ) {
    // If the user is authenticated but does not have a store token, redirect to store login
    const signInUrl = new URL("/login", request.url);
    signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (storeToken && isStorePath(pathname)) {
    // If the user is authenticated and trying to access a store path, allow access
    return NextResponse.next();
  }

  // Handle admin routes with RBAC
  if (isAdminPath && pathname !== "/admin-sign-in") {
    // If no admin token, redirect to admin sign-in
    if (!adminToken) {
      const signInUrl = new URL("/admin-sign-in", request.url);
      signInUrl.searchParams.set(
        "redirect",
        request.nextUrl.pathname || "/admin/dashboard"
      );
      return NextResponse.redirect(signInUrl);
    }

    // Verify admin token and check permissions
    const adminData = await verifyAdminToken(adminToken);
    // console.log("Admin Data:", adminData);
    if (!adminData) {
      // Invalid token, redirect to admin sign-in
      const signInUrl = new URL("/admin-sign-in", request.url);
      signInUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Get admin permissions based on roles
    const adminPermissions = getAdminPermissions(adminData.roles);

    // Check if admin has permission to access this route
    const requiredPermissions = ROUTE_PERMISSIONS[pathname] || [];
    // console.log("pathName:", pathName);
    // console.log("Required Permissions:", requiredPermissions);
    // console.log("Admin Permissions:", adminPermissions);
    if (!hasPermission(adminPermissions, requiredPermissions)) {
      // Admin doesn't have permission, redirect to forbidden page
      return NextResponse.redirect(new URL("/admin/forbidden", request.url));
    }
  }

  // Everything else is allowed
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/|favicon.ico|.*\\..*).*)"],
  //   runtime: "nodejs",
};

/**
 * Checks if a given path matches a dynamic store route that includes a valid MongoDB ObjectId.
 *
 * This ensures only paths like:
 *   - /store/684c94a748eb382ea33710aa
 *   - /store/684c94a748eb382ea33710aa/products
 *   - /store/684c94a748eb382ea33710aa/...
 * are considered protected store routes.
 *
 * Public routes like:
 *   - /store/create
 *   - /store/onboarding
 *   - /store/preview/...
 * will NOT match and are therefore treated separately.
 *
 * @param path - The URL path to evaluate.
 * @returns A boolean indicating whether the path is a recognized store route.
 */
const isStorePath = (path: string) => {
  return /^\/store\/[a-f\d]{24}(\/.*)?$/i.test(path);
};

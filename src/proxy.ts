import { NextResponse, NextRequest } from "next/server";
import { getAdminPermissions } from "./modules/admin/jwt-utils";
import { ROUTE_PERMISSIONS } from "./modules/admin/security/route-permissions";
import { hasPermission } from "./modules/admin/security/access-control";
import { publicPaths } from "./constants/constant";
import { ProxyUtils } from "./lib/utils/proxy-utils";
import { getStoreDataFromToken } from "./lib/helpers/get-store-data-from-token";
import {
  CookieService,
  StoreTokenPayload,
} from "./services/cookies-&-auth-tokens/cookies-auth-tokens.service";

export async function proxy(request: NextRequest) {
  const proxyUtils = new ProxyUtils(request);

  const pathname = proxyUtils.getPathname();
  const adminToken = proxyUtils.getAdminToken();
  const isPublic = proxyUtils.isPublicPath(publicPaths);
  const isAdminPath = proxyUtils.isAdminPath();
  const isProtectedStoreOnboardingPath =
    proxyUtils.isProtectedStoreOnboardingPath();
  console.log("proxy triggered for path:", pathname);

  // Authenticated users should not access sign-in or sign-up
  if (proxyUtils.isUserAuthenticated() && proxyUtils.isUserAuthPage()) {
    return proxyUtils.createRedirect("/");
  }

  // Unauthenticated users trying to access protected routes
  if (!proxyUtils.isUserAuthenticated() && !isPublic) {
    // Redirect to sign-in page with redirect parameter
    return proxyUtils.createRedirectWithReturn("/sign-in", pathname);
  }

  // If your token payload includes storeId, extract and redirect dynamically
  // Redirect the store to its dashboard
  if (proxyUtils.isStoreAuthenticated() && pathname === "/login") {
    // Extract redirect query parameter if it exists
    const redirectPath = request.nextUrl.searchParams.get("redirect");

    if (redirectPath) {
      // User originally wanted to visit this path
      return proxyUtils.createRedirect(redirectPath);
    }

    // Otherwise, dynamically redirect based on storeId from token
    const storeToken = (await getStoreDataFromToken(
      request,
    )) as StoreTokenPayload; // We know that this will always exist because the store is authenticated
    const storeId = storeToken.id;

    const target = storeId ? `/store/${storeId}/dashboard` : "/";

    return proxyUtils.createRedirect(target);
  }

  // If the user is authenticated but does not have a store token, redirect to store login
  if (
    !proxyUtils.isStoreAuthenticated() &&
    (proxyUtils.isStorePath(pathname) || isProtectedStoreOnboardingPath)
  ) {
    return proxyUtils.createRedirectWithReturn("/login", pathname);
  }

  // If the user is authenticated and trying to access a store path, allow access
  if (proxyUtils.isStoreAuthenticated() && proxyUtils.isStorePath(pathname)) {
    return NextResponse.next();
  }

  // Handle admin routes with RBAC
  if (isAdminPath && pathname !== "/admin-sign-in") {
    // If no admin token, redirect to admin sign-in
    if (!adminToken) {
      return proxyUtils.createRedirectWithReturn("/admin-sign-in", pathname);
    }

    // Verify admin token and check permissions
    const adminData = await CookieService.verifyAdminToken(adminToken);
    if (!adminData) {
      // Invalid token, redirect to admin sign-in
      return proxyUtils.createRedirectWithReturn("/admin-sign-in", pathname);
    }

    // Get admin permissions based on roles
    const adminPermissions = getAdminPermissions(adminData.roles);

    // Check if admin has permission to access this route
    const requiredPermissions = ROUTE_PERMISSIONS[pathname] || [];
    if (!hasPermission(adminPermissions, requiredPermissions)) {
      // Admin doesn't have permission, redirect to forbidden page
      return proxyUtils.createRedirectWithReturn("/admin/forbidden", pathname);
    }
  }

  // Everything else is allowed
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/|favicon.ico|.*\\..*).*)"],
};

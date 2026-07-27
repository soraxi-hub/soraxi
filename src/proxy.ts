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
  const isStorePath = proxyUtils.isStorePath(pathname);
  console.log("proxy triggered for path:", pathname);

  // Authenticated users should not access sign-in or sign-up
  if (proxyUtils.isUserAuthenticated() && proxyUtils.isUserAuthPage()) {
    return proxyUtils.createRedirect("/");
  }

  // ---------------------------------------------------------------------
  // STORE ROUTES — evaluated independently of user auth, using the store
  // token only. Must run BEFORE the generic user-auth gate below, or a
  // store owner with no user token gets bounced to /sign-in first.
  // ---------------------------------------------------------------------

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

  if (isStorePath || isProtectedStoreOnboardingPath) {
    // No store token — send to store login, not the general sign-in page
    if (!proxyUtils.isStoreAuthenticated()) {
      return proxyUtils.createRedirectWithReturn("/login", pathname);
    }

    // Store token present — allow access on its own, no user token required
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------
  // ADMIN ROUTES — evaluated independently of user auth, using the admin
  // token only. Also must run BEFORE the generic user-auth gate below.
  // ---------------------------------------------------------------------
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

    // Admin token valid and permitted — allow access, no user token required
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------
  // EVERYTHING ELSE — regular user-facing routes still require a user
  // token unless the path is public. Store/admin paths never reach here.
  // ---------------------------------------------------------------------
  if (!proxyUtils.isUserAuthenticated() && !isPublic) {
    // Redirect to sign-in page with redirect parameter
    return proxyUtils.createRedirectWithReturn("/sign-in", pathname);
  }

  // Everything else is allowed
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/|favicon.ico|.*\\..*).*)"],
};

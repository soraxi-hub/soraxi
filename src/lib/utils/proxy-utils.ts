import { TokenType } from "@/services/cookies-&-auth-tokens/cookies-auth-tokens.service";
import { NextRequest, NextResponse } from "next/server";

/**
 * Utility class for handling route checks, token extraction,
 * authentication state, and redirect creation inside the proxy file.
 *
 * This keeps the main proxy middleware clean by moving repeated
 * request-related logic into reusable helper methods.
 */
export class ProxyUtils {
  private pathname: string;
  private request: NextRequest;

  constructor(request: NextRequest) {
    // Store the normalized pathname once so all helper methods
    // can reuse it without repeatedly accessing request.nextUrl
    this.pathname = request.nextUrl.pathname;
    this.request = request;
  }

  /**
   * Returns the current request pathname.
   *
   * Useful when the proxy file needs direct access to the route
   * without reading from request.nextUrl multiple times.
   */
  getPathname(): string {
    return this.pathname;
  }

  /**
   * Returns admin-specific routes that should be treated as admin pages
   * even if they do not live under the /admin prefix.
   *
   * Example:
   * - /admin-sign-in
   */
  getStandaloneAdminRoutes(): string[] {
    return ["/admin-sign-in"];
  }

  /**
   * Retrieves a cookie token value by name.
   *
   * @param tokenName - The cookie key to extract.
   * @returns The token value if found, otherwise undefined.
   */
  getToken(tokenName: string): string | undefined {
    const token = this.request.cookies.get(tokenName)?.value;
    return token;
  }

  /**
   * Retrieves the authenticated user token.
   */
  getUserToken() {
    return this.getToken(TokenType.User);
  }

  /**
   * Retrieves the authenticated store token.
   */
  getStoreToken() {
    return this.getToken(TokenType.Store);
  }

  /**
   * Retrieves the authenticated admin token.
   */
  getAdminToken() {
    return this.getToken(TokenType.Admin);
  }

  /**
   * Checks whether the current route is publicly accessible.
   *
   * Supports:
   * - exact static routes
   * - wildcard routes using :path*
   * - special dynamic handling for /requests and /requests/:id
   *
   * @param publicPaths - List of allowed public routes.
   * @returns True if current pathname is public.
   */
  isPublicPath(publicPaths: string[]): boolean {
    return publicPaths.some((path) => {
      if (path === "/requests") {
        const segments = this.pathname.split("/").filter(Boolean);

        // /requests
        if (segments.length === 1) return true;

        // /requests/[id]
        if (
          segments.length === 2 &&
          segments[0] === "requests" &&
          segments[1] !== "new"
        ) {
          return true;
        }

        return false;
      } else if (
        path.includes(":path*") &&
        !this.pathname.startsWith("/requests")
      ) {
        const basePath = path.replace("/:path*", "");
        return this.pathname.startsWith(basePath);
      }

      return this.pathname === path;
    });
  }

  // Check if the path is an admin path
  isAdminPath(): boolean {
    const adminRoutes = this.getStandaloneAdminRoutes();

    return (
      this.pathname.startsWith("/admin/") || adminRoutes.includes(this.pathname)
    );
  }

  /**
   * Checks whether the current route is a user authentication page.
   *
   * Used to prevent already authenticated users from revisiting
   * sign-in or sign-up pages.
   */
  isUserAuthPage(): boolean {
    return ["/sign-in", "/sign-up"].includes(this.pathname);
  }

  /**
   * Checks whether a valid user session token exists.
   */
  isUserAuthenticated(): boolean {
    return !!this.getUserToken();
  }

  /**
   * Checks whether a valid store session token exists.
   */
  isStoreAuthenticated(): boolean {
    return !!this.getStoreToken();
  }

  /**
   * Checks whether a valid admin session token exists.
   */
  isAdminAuthenticated(): boolean {
    return !!this.getAdminToken();
  }

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
  isStorePath(path: string): boolean {
    return /^\/store\/[a-f\d]{24}(\/.*)?$/i.test(path);
  }

  /**
   * Determines if the current path is a protected store onboarding route.
   * Use this in your middleware condition alongside `isStorePath()`.
   *
   * Match only dynamic onboarding paths like /store/onboarding/:storeId/...
   */
  isProtectedStoreOnboardingPath(): boolean {
    return /^\/store\/onboarding\/[a-f\d]{24}(\/.*)?$/i.test(this.pathname);
  }

  /**
   * Creates a redirect response to a target path.
   *
   * Best used for simple route redirects that do not require
   * preserving the original destination.
   *
   * @param path - Destination path.
   */
  createRedirect(path: string): NextResponse {
    return NextResponse.redirect(new URL(path, this.request.url));
  }

  /**
   * Creates a redirect response while preserving the original route
   * in a `redirect` query parameter.
   *
   * Useful for auth flows where users should be returned to the
   * page they originally attempted to visit after login.
   *
   * Example:
   * /sign-in?redirect=/checkout
   *
   * @param target - Redirect destination (e.g. /sign-in)
   * @param redirectPath - Original requested path
   */
  createRedirectWithReturn(target: string, redirectPath: string): NextResponse {
    const url = new URL(target, this.request.url);
    url.searchParams.set("redirect", redirectPath);
    return NextResponse.redirect(url);
  }
}

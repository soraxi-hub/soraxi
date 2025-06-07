import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * This is the dynamic API route handler for NextAuth.js
 * It handles all authentication-related requests
 *
 * The configuration is imported from lib/auth.ts to keep this file clean
 * and to allow reusing the auth configuration elsewhere in the application
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

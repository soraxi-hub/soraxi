"use client";

import type React from "react";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

/**
 * Auth provider component that wraps the application with SessionProvider
 * This enables the use of useSession() hook throughout the app
 *
 * @param children - The child components to be wrapped
 * @param session - The session object (optional)
 */
export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}

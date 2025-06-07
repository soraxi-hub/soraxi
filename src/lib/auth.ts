import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/db/mongoose";
import bcrypt from "bcryptjs";
import { getUserByEmail, IUser } from "./db/models/user.model";
import mongoose from "mongoose";

/**
 * NextAuth.js configuration options
 * This is used by the [...nextauth] API route and can be imported elsewhere
 * to access the session on the server side
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          // Connect to the database
          await connectToDatabase();

          // Find the user by email
          const user = (await getUserByEmail(credentials.email)) as
            | (IUser & { _id: mongoose.Schema.Types.ObjectId })
            | null;

          // If user not found or password doesn't match
          if (!user) {
            throw new Error("User not found");
          }

          // If user not found or password doesn't match
          if (!(await bcrypt.compare(credentials.password, user.password))) {
            throw new Error("Invalid Password");
          }

          // Return the user object (excluding the password)
          return {
            id: user._id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw new Error("Authentication failed");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user role to the token if available
      if (user) {
        token.id = user.id;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user role and id to the session
      if (token && session.user) {
        session.user._id = token.id as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in", // Error code passed in query string as ?error=
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day in seconds
  },
  secret: process.env.NEXTAUTH_SECRET,
};

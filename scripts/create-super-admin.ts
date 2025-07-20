/**
 * This script creates a super admin user
 * Run: npx tsx scripts/create-super-admin.ts
 */

import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import { ROLES } from "@/modules/shared/roles";
import dotenv from "dotenv";
import { getAdminModel } from "@/lib/db/models/admin.model";

dotenv.config();

export async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const Admin = await getAdminModel();

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({
      roles: ROLES.SUPER_ADMIN,
    });
    if (existingSuperAdmin) {
      console.log("Super admin already exists:", existingSuperAdmin.email);
      await mongoose.disconnect();
      return;
    }

    // Create super admin credentials
    const name = "Mishael Joseph Etukudo";
    const email = "mishaeljoe55@gmail.com"; // Change this to your email
    const password = "Aacc@5566"; // Change this to a secure password

    // Hash the password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    // Create super admin
    const superAdmin = new Admin({
      name,
      email,
      password: hashedPassword,
      roles: [ROLES.SUPER_ADMIN],
      isActive: true,
    });

    await superAdmin.save();
    console.log("Super admin created successfully:", email);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
}

createSuperAdmin();

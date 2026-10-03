import * as z from "zod";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/constants/auth.constants";

export const adminSignInInfoValidation = z.object({
  email: z.string({
    required_error: "Required",
  }),
  password: z
    .string({
      required_error: "Required",
    })
    .min(ADMIN_PASSWORD_MIN_LENGTH, "Password must be at least 8 characters"),
});

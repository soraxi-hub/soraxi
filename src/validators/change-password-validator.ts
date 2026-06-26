import * as z from "zod";
import { passwordValidation } from "@/validators/user-signUp-info-validation";

/**
 * Schema for the change password form.
 * Requires the user's current password for verification,
 * and validates the new password against the application's
 * shared passwordValidation rules.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string({
      required_error: "Required",
    }),
    newPassword: passwordValidation,
    confirmNewPassword: z.string({
      required_error: "Required",
    }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    path: ["confirmNewPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from your current password",
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

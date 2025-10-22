import * as z from "zod";

/**
 * General password validation schema for the application
 *
 */
export const passwordValidation = z
  .string({
    required_error: "Required",
  })
  .min(8, { message: "Minimum 8 Characters" })
  .max(16, "Password must be at most 16 characters")
  .refine((value) => /[A-Z]/.test(value), {
    message: "Must contain at least one uppercase letter",
  })
  .refine((value) => /[a-z]/.test(value), {
    message: "Must contain at least one lowercase letter",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "Must contain at least one number",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "Must contain at least one special character",
  });

export const userSignUpInfoValidation = z.object({
  firstName: z
    .string({
      required_error: "Required",
    })
    .min(3, { message: "Minimum 3 Characters" })
    .max(15),
  lastName: z
    .string({
      required_error: "Required",
    })
    .min(3, { message: "Minimum 3 Characters" })
    .max(15),
  otherNames: z
    .string({
      required_error: "Required",
    })
    .min(3, { message: "Minimum 3 Characters" })
    .max(15),
  email: z
    .string({
      required_error: "Required",
    })
    .email("Invalid email address"),
  password: passwordValidation,
  confirmPassword: z.string({
    required_error: "Required",
  }),
  address: z
    .string({
      required_error: "Required",
    })
    .min(3, { message: "Minimum 3 Characters" })
    .max(50),
  phoneNumber: z
    .string({
      required_error: "Required",
    })
    .min(11)
    .max(14),
  cityOfResidence: z
    .string({
      required_error: "Required",
    })
    .min(2, { message: "Minimum 2 Characters" })
    .max(50),
  stateOfResidence: z
    .string({
      required_error: "Required",
    })
    .min(2, { message: "Minimum 2 Characters" })
    .max(50),
  postalCode: z
    .string({
      required_error: "Required",
    })
    .min(4, { message: "Minimum 4 Characters" })
    .max(10),
});

export const editProfileValidation = userSignUpInfoValidation.omit({
  password: true,
  confirmPassword: true,
});

export const resetPasswordSchema = userSignUpInfoValidation
  .pick({
    password: true,
    confirmPassword: true,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type UserSignUpInfo = z.infer<typeof userSignUpInfoValidation>;
export type EditProfileInfo = z.infer<typeof editProfileValidation>;
export type ResetPasswordInfo = z.infer<typeof resetPasswordSchema>;

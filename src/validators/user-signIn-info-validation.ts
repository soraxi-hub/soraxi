import * as z from "zod";

export const userSignInInfoValidation = z.object({
  email: z.string({
    required_error: "Required",
  }),
  password: z
    .string({
      required_error: "Required",
    })
    .min(8, { message: "Minimum 8 Characters" })
    .max(16)
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
    }),
});

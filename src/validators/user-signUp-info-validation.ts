import * as z from "zod";

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
export type UserSignUpInfo = z.infer<typeof userSignUpInfoValidation>;
export type EditProfileInfo = z.infer<typeof editProfileValidation>;

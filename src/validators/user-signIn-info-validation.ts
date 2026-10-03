import * as z from "zod";
import { passwordValidation } from "./user-signUp-info-validation";

export const userSignInInfoValidation = z.object({
  email: z.string({
    required_error: "Required",
  }),
  password: passwordValidation,
});

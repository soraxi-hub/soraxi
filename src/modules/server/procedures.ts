import { getUserByEmail } from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { z } from "zod";

export const userRouter = createTRPCRouter({
  getByEmail: baseProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async (input) => {
      const { email } = input.input;

      const user = await getUserByEmail(email);
      return user;
    }),
});

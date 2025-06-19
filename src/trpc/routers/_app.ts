import { userRouter } from "@/modules/server/procedures";
import { createTRPCRouter } from "../init";
import { storeRouter } from "@/modules/server/store/procedures";
export const appRouter = createTRPCRouter({
  users: userRouter,
  store: storeRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;

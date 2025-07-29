import { getAdminFromCookie } from "@/lib/helpers/get-admin-from-cookie";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { initTRPC } from "@trpc/server";
import SuperJSON from "superjson";

export const createTRPCContext = async () => {
  /**
   * @see: https://trpc.io/docs/server/context
   */

  const user = await getUserFromCookie();
  const store = await getStoreFromCookie();
  const admin = await getAdminFromCookie();
  return { user, store, admin };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: SuperJSON,
});

// Optional: Middleware to ensure proper context structure (not required unless you want to modify it)
const middleware = t.middleware(({ ctx, next }) => {
  return next({
    ctx: {
      user: ctx.user,
      store: ctx.store,
      admin: ctx.admin,
    },
  });
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure.use(middleware);

import { getAdminFromCookie } from "@/lib/helpers/get-admin-from-cookie";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { AppError } from "@/lib/errors/app-error";

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
/**
 * Generic text substituted for any message we cannot prove was written for a
 * user. Deliberately says nothing about the cause.
 */
const OPAQUE_MESSAGE = "Something went wrong on our end. Please try again.";

/**
 * Was this error's message written by us, for a user to read?
 *
 * The distinction matters because tRPC serialises `message` to the client in
 * every environment — unlike Next.js, which masks Server Component errors
 * behind a digest in production. Anything that reaches `shape.message`
 * reaches the browser.
 *
 * Rather than retrofit a flag onto ~30 existing `throw new TRPCError` sites,
 * this infers authorship from where the message came from:
 *
 * - **No `cause`** → a developer typed the string. Authored.
 * - **`cause` is an `AppError`** → our domain error type. Authored.
 * - **`cause` is a `TRPCError`** → already passed through this same rule.
 * - **`cause.message === error.message`** → the message was *copied* off a
 *   caught exception, so it is whatever the library happened to say. Not
 *   authored — this is the case that leaked the MongoDB connection string.
 * - **`cause` present but message differs** → we caught something and wrote
 *   our own replacement. Authored.
 */
function hasAuthoredMessage(error: TRPCError): boolean {
  const cause = error.cause;

  if (!(cause instanceof Error)) return true;
  if (cause instanceof AppError) return true;
  if (cause instanceof TRPCError) return true;

  return cause.message !== error.message;
}

/** Short token the user can quote to support, correlated to the server log. */
function newErrorRef(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Carries the correlation reference from `maskUnauthoredErrors` (which logs
 * it) to `errorFormatter` (which serialises it to the client).
 *
 * The two run at different stages and each used to mint its own token, so the
 * reference a user was told to quote appeared in no log line — support would
 * search for a string that never existed server-side. Minting once and
 * passing it along is the whole point of the reference.
 *
 * A symbol rather than a plain field so it cannot collide with anything tRPC
 * or a library puts on the error, and never appears in serialisation.
 */
const ERROR_REF = Symbol("soraxi.errorRef");

type ErrorRefCarrier = { [ERROR_REF]?: string };

/** Stamp the reference onto the error travelling to the formatter. */
function attachErrorRef<E extends object>(error: E, ref: string): E {
  (error as E & ErrorRefCarrier)[ERROR_REF] = ref;
  return error;
}

/** Read a reference stamped by the masking middleware, if there is one. */
function readErrorRef(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as ErrorRefCarrier)[ERROR_REF];
}

const t = initTRPC.context<Context>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: SuperJSON,

  /**
   * Attaches the support reference and strips the stack.
   *
   * Message masking deliberately does NOT live here. `errorFormatter` is
   * applied by the HTTP adapter only — a direct server caller
   * (`createTRPCOptionsProxy` / `createCaller`, which is how pages prefetch)
   * never reaches it, so masking here would leave the entire server-rendered
   * path uncovered. That job belongs to `maskUnauthoredErrors` below, which
   * runs on both paths. By the time an error arrives here its message has
   * already been vetted.
   */
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Reuse the reference the masking middleware already logged, so the
        // token the user quotes is the one support can actually grep for.
        // The fallback covers errors that never passed through masking
        // (authored messages), which have no log line to correlate with
        // anyway — those users are quoting a real message, not a token.
        ref: readErrorRef(error) ?? newErrorRef(),
        // Never ship a stack, regardless of environment. tRPC includes the
        // original message inside it, so leaving it would reopen the leak by
        // a side door.
        stack: undefined,
      },
    };
  },
});

/**
 * Replaces any error message we cannot prove was written for a user.
 *
 * This is middleware rather than an `errorFormatter` because middleware runs
 * for every invocation path — the HTTP adapter *and* the direct server caller
 * used by page prefetches. An `errorFormatter` covers only the former, which
 * would leave server-rendered pages exposed: exactly where the raw
 * connection-pool error was rendered in the first place.
 *
 * Procedures that wrap their body in `handleTRPCError` are already safe; this
 * catches the ones that let an exception propagate, where tRPC builds the
 * `TRPCError` itself and copies the original message onto it.
 */
const maskUnauthoredErrors = t.middleware(async ({ next }) => {
  const result = await next();

  if (result.ok || hasAuthoredMessage(result.error)) return result;

  const ref = newErrorRef();

  // The real error still has to be diagnosable, so log it against the same
  // reference the user is shown — see ERROR_REF for why it is carried on the
  // error rather than regenerated in the formatter.
  console.error(
    `[trpc:${ref}] ${result.error.code} — masked:`,
    result.error.cause ?? result.error,
  );

  return {
    ...result,
    error: attachErrorRef(
      new TRPCError({
        code: result.error.code,
        message: OPAQUE_MESSAGE,
        cause: result.error.cause,
      }),
      ref,
    ),
  };
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
// Masking runs outermost so it also covers errors raised by the context
// middleware below it, not just by procedure bodies.
export const baseProcedure = t.procedure.use(maskUnauthoredErrors).use(middleware);

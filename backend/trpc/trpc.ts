import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./create-context";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseApp } from "./firebase-utils";

/**
 * Standardized tRPC initialization.
 * Removed superjson transformer to ensure 100% compatibility with the Hono/fetch adapter
 * and consistent behavior across mobile and web platforms.
 */
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Missing or invalid authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await getAuth(getFirebaseApp()).verifyIdToken(idToken);
    return next({
      ctx: {
        ...ctx,
        user: decodedToken,
      },
    });
  } catch (error) {
    console.error("[TRPC] Token verification failed:", error);
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
  }
});

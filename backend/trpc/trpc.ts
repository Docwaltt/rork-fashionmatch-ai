import { initTRPC, TRPCError } from "@trpc/server";
import { Context } from "./create-context";
import superjson from "superjson";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseApp } from "./firebase-utils";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // For local development or if auth is managed elsewhere, we might want a fallback
    // But for production, this should be strict.
    // Given the wardrobe.ts usage of ctx.user.uid, we MUST have a user.
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

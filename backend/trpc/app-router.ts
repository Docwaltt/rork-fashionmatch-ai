import { createTRPCRouter, publicProcedure } from "./create-context";
import { exampleRouter } from "./routes/example";
import { wardrobeRouter } from "./routes/wardrobe";

export const appRouter = createTRPCRouter({
  ping: publicProcedure.query(() => ({ status: "ok", timestamp: Date.now() })),
  example: exampleRouter,
  wardrobe: wardrobeRouter,
});

export type AppRouter = typeof appRouter;

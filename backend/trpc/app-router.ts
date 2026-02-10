import { router, publicProcedure } from "./trpc";
import { exampleRouter } from "./routes/example";
import { wardrobeRouter } from "./routes/wardrobe";

export const appRouter = router({
  ping: publicProcedure.query(() => ({ status: "ok", timestamp: Date.now() })),
  example: exampleRouter,
  wardrobe: wardrobeRouter,
});

export type AppRouter = typeof appRouter;

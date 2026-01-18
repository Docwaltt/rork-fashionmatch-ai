import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { wardrobeRouter } from "./routes/wardrobe";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  wardrobe: wardrobeRouter,
});

export type AppRouter = typeof appRouter;

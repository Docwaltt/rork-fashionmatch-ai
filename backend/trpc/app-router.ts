import { createTRPCRouter, publicProcedure } from "./create-context";
import { exampleRouter } from "./routes/example";
import { wardrobeRouter } from "./routes/wardrobe";

import { publicProcedure as pProc } from "./create-context";
import fs from "fs";
import path from "path";

export const appRouter = createTRPCRouter({
  ping: publicProcedure.query(() => ({ status: "ok", timestamp: Date.now() })),
  example: exampleRouter,
  wardrobe: wardrobeRouter,
});

export type AppRouter = typeof appRouter;

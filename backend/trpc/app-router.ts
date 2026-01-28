import { createTRPCRouter, publicProcedure } from "./create-context";
import { exampleRouter } from "./routes/example";
import { wardrobeRouter } from "./routes/wardrobe";

import { publicProcedure as pProc } from "./create-context";
import fs from "fs";
import path from "path";

export const appRouter = createTRPCRouter({
  ping: publicProcedure.query(() => ({ status: "ok", timestamp: Date.now() })),
  debugEnv: publicProcedure.query(() => {
    try {
      const info = {
        cwd: process.cwd(),
        dirname: __dirname,
        envKeys: Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("SECRET") && !k.includes("PASSWORD")),
        files: {
          cwd: fs.readdirSync(process.cwd()),
          parent: fs.readdirSync(path.join(process.cwd(), "..")),
          grandparent: fs.readdirSync(path.join(process.cwd(), "../..")),
        }
      };
      return info;
    } catch (e: any) {
      return { error: e.message };
    }
  }),
  example: exampleRouter,
  wardrobe: wardrobeRouter,
});

export type AppRouter = typeof appRouter;

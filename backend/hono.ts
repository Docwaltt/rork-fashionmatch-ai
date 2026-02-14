import { trpcServer } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

/**
 * tRPC implementation for Hono.
 * Directly using the standard fetch adapter to ensure maximum compatibility
 * and prevent unwanted character injection into the response stream.
 */
app.all(
  "/api/trpc/*",
  async (c) => {
    const res = await trpcServer({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext: () => createContext({ req: c.req.raw, resHeaders: new Headers() }),
    });
    
    // THE FIX: Explicitly handle the response and ensure no extra characters are prepended.
    // We convert the response to text, strip any potential 'null' or whitespace, and send it fresh.
    const text = await res.text();
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

    if (startIdx !== -1) {
        return c.text(text.substring(startIdx), {
            status: res.status,
            headers: res.headers,
        });
    }

    return c.newResponse(text, res.status, res.headers);
  }
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

export default app;

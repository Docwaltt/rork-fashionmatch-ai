import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";
import { config } from "dotenv";
import path from "path";

// Explicitly load environment variables for the API route
const envPath = path.resolve(process.cwd(), ".env");
console.log("[tRPC API] Loading .env from:", envPath);
config({ path: envPath });

console.log("[tRPC API] Environment Check - GOOGLE_PROJECT_ID:", process.env.GOOGLE_PROJECT_ID);

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";
import { config } from "dotenv";
import path from "path";
import fs from "fs";

// Explicitly load environment variables for the API route
const possibleEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../../.env"), // Adjust based on build structure
  "/.env",
];

let loaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log("[tRPC API] Loading .env from:", envPath);
    config({ path: envPath });
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn("[tRPC API] No .env file found in expected locations.");
  // Try loading default dotenv in case it's in the current directory
  config();
}

console.log("[tRPC API] Environment Check - GOOGLE_PROJECT_ID:", process.env.GOOGLE_PROJECT_ID ? "Found" : "NOT FOUND");
console.log("[tRPC API] Environment Check - GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "Found" : "NOT FOUND");

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };

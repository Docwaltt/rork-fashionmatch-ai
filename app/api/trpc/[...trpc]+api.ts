import { config } from "dotenv";
import path from "path";
import fs from "fs";

// Move dotenv loading to the very top, before other imports
console.log("[tRPC API] --- Environment Initialization ---");
console.log("[tRPC API] process.cwd():", process.cwd());
console.log("[tRPC API] __dirname:", __dirname);

function findEnvFile(startDir: string, limit = 5): string | null {
  let currentDir = startDir;
  for (let i = 0; i < limit; i++) {
    const envPath = path.join(currentDir, ".env");
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }
  return null;
}

const envFile = findEnvFile(process.cwd(), 10) || findEnvFile(__dirname, 10) || findEnvFile("/", 10);

if (envFile) {
  console.log("[tRPC API] Found .env at:", envFile);
  try {
    const content = fs.readFileSync(envFile, 'utf8');
    console.log("[tRPC API] .env content length:", content.length);

    // Explicitly parse and assign to process.env to ensure it works in all environments
    const parsed = require('dotenv').parse(content);
    console.log("[tRPC API] Parsed keys:", Object.keys(parsed));

    for (const key in parsed) {
      if (!process.env[key]) {
        process.env[key] = parsed[key];
      }
    }
  } catch (e) {
    console.error("[tRPC API] Error reading/parsing .env manually:", e);
    config({ path: envFile });
  }
} else {
  console.warn("[tRPC API] Could not find .env file in tree.");
  config(); // Try default
}

// Final check with fallback to common names if they are slightly different
process.env.GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

console.log("[tRPC API] GOOGLE_PROJECT_ID:", process.env.GOOGLE_PROJECT_ID ? "Found" : "MISSING");
console.log("[tRPC API] GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "Found" : "MISSING");

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/backend/trpc/app-router";
import { createContext } from "@/backend/trpc/create-context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };

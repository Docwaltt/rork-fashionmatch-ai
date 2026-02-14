import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/backend/trpc/app-router";

/**
 * tRPC React Query client configuration.
 * Global synchronization on standard JSON for 100% reliability across Hono, 
 * fetch adapters, and Cloud Functions.
 */
export const trpc = createTRPCReact<AppRouter>();

// Transformer is now undefined (standard JSON) project-wide.
export const transformer = undefined;

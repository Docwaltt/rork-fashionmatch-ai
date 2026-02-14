import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/backend/trpc/app-router";

/**
 * tRPC React Query client configuration.
 * Removed superjson transformer to align with standard JSON output from the Hono/tRPC backend.
 */
export const trpc = createTRPCReact<AppRouter>();

// Standard JSON transformer is used by default when none is specified.
export const transformer = undefined;

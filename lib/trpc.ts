import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

/**
 * tRPC React Query client configuration.
 * Using superjson transformer to align with the backend's configuration in trpc.ts.
 */
export const trpc = createTRPCReact<AppRouter>();

export const transformer = superjson;

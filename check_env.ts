import { initializeEnv } from "./backend/trpc/env-util";
initializeEnv();
console.log("EXPO_PUBLIC_FIREBASE_PROJECT_ID:", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log("GOOGLE_PRIVATE_KEY exists:", !!process.env.GOOGLE_PRIVATE_KEY);
if (process.env.GOOGLE_PRIVATE_KEY) {
    console.log("GOOGLE_PRIVATE_KEY length:", process.env.GOOGLE_PRIVATE_KEY.length);
    console.log("GOOGLE_PRIVATE_KEY contains \\n:", process.env.GOOGLE_PRIVATE_KEY.includes('\n'));
    console.log("GOOGLE_PRIVATE_KEY contains actual newline:", process.env.GOOGLE_PRIVATE_KEY.includes('\n'));
}

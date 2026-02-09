import { GoogleAuth } from "google-auth-library";
import { initializeEnv } from "./env-util";

async function test() {
  console.log("Initializing env...");
  initializeEnv();

  console.log("GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  console.log("GOOGLE_PRIVATE_KEY exists:", !!process.env.GOOGLE_PRIVATE_KEY);

  if (!process.env.GOOGLE_PRIVATE_KEY) {
      console.error("No private key found!");
      return;
  }

  const auth = new GoogleAuth();
  const url = "https://analyzeimage-pfc64ufnsq-uc.a.run.app";

  try {
    console.log("Attempting to get ID token client...");
    const client = await auth.getIdTokenClient(url);
    console.log("Success! Client obtained.");

    // We can try to get an actual token
    // console.log("Attempting to get token...");
    // const token = await client.idTokenProvider.fetchIdToken(url);
    // console.log("Token obtained, length:", token.length);
  } catch (error: any) {
    console.error("Auth Error:", error.message);
    if (error.stack) console.error(error.stack);
  }
}

test();

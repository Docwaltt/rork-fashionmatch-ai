import { GoogleAuth } from "google-auth-library";

const functionUrl = "https://processclothingfn-pfc64ufnsq-uc.a.run.app";
const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID,
  },
});

async function test() {
  try {
    const targetAudience = "https://processclothingfn-pfc64ufnsq-uc.a.run.app";
    console.log("Getting ID token for", targetAudience);
    console.log("Credentials available:", !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    const client = await auth.getIdTokenClient(targetAudience);
    const headers = await client.getRequestHeaders() as Record<string, string>;
    console.log("Headers obtained.");
    console.log("Status: 200 (Simulated success after auth check)");
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

test();

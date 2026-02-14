import { GoogleAuth } from "google-auth-library";
import { initializeApp, getApp, getApps, App } from "firebase-admin/app";
import { credential } from "firebase-admin";
import axios from "axios";

const auth = new GoogleAuth();

/**
 * Gets or initializes a Firebase Admin App instance.
 */
export function getFirebaseApp(): App {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (privateKey && clientEmail) {
    return initializeApp({
      credential: credential.cert({
        projectId,
        privateKey,
        clientEmail,
      }),
      storageBucket: `${projectId}.appspot.com`,
    });
  }

  return initializeApp({
    projectId,
    storageBucket: `${projectId}.appspot.com`,
  });
}

/**
 * Helper to call Firebase Cloud Functions from a Node.js environment
 * using authenticated HTTP requests.
 */
export async function callFirebaseFunction(functionName: string, data: any) {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'closet-app-1337';
  const region = process.env.FIREBASE_REGION || 'us-central1';

  let url: string | undefined;
  if (functionName === 'analyzeImage') url = process.env.FUNCTION_ANALYZEIMAGE_URL;
  if (functionName === 'suggestOutfit') url = process.env.FUNCTION_SUGGESTOUTFIT_URL;
  if (functionName === 'generateOutfitsFn') url = process.env.FUNCTION_GENERATEOUTFITSFN_URL;
  if (functionName === 'processClothingFn') url = process.env.FUNCTION_PROCESSCLOTHINGFN_URL;

  if (!url) {
    if (functionName === 'generateOutfitsFn' || functionName === 'suggestOutfit') {
      const name = (functionName === 'suggestOutfit') ? 'generateOutfitsFn' : functionName;
      url = `https://${name.toLowerCase()}-pfc64ufnsq-uc.a.run.app`;
    } else if (functionName === 'processClothingFn' || functionName === 'analyze') {
      url = `https://processclothingfn-pfc64ufnsq-uc.a.run.app`;
    } else {
      url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
    }
  }

  console.log(`[DEBUG] [FirebaseUtils] [v2.3] CALLING: ${functionName} at ${url}`);

  try {
    // 1. Manually fetch the ID token for the target URL
    const client = await auth.getIdTokenClient(url);
    const tokenResponse = await client.getRequestHeaders();
    const authHeader = tokenResponse.Authorization;

    // 2. Use direct axios call for absolute control over the body
    const response = await axios.post(url, 
      { data }, // Wrap in 'data' to match Firebase Callable-like convention
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        timeout: 120000,
        responseType: 'text',
      }
    );

    const rawText = String(response.data);
    console.log(`[DEBUG] [FirebaseUtils] RAW START: "${rawText.substring(0, 15)}"`);

    let result: any;
    
    // Robust extraction: find the JSON body even if junk is prepended
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const cleanedText = rawText.substring(firstBrace, lastBrace + 1);
      try {
        result = JSON.parse(cleanedText);
      } catch (parseError: any) {
        console.error(`[DEBUG] [FirebaseUtils] Parse error: ${parseError.message}`);
        throw parseError;
      }
    } else {
      result = JSON.parse(rawText);
    }

    if (result && result.result !== undefined) {
      result = result.result;
    }

    if (result === null || result === undefined) return {};
    
    console.log(`[DEBUG] [FirebaseUtils] SUCCESS: ${functionName}. Keys:`, Object.keys(result));
    return result;
  } catch (error: any) {
    console.error(`[DEBUG] [FirebaseUtils] FAILED function ${functionName}:`, error.message);
    if (error.response && error.response.data) {
        console.error(`[DEBUG] [FirebaseUtils] RAW ERROR BODY:`, String(error.response.data).substring(0, 200));
    }
    throw error;
  }
}

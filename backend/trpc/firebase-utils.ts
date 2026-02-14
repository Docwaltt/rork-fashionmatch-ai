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

  console.log(`[DEBUG] [v3.0] CALLING: ${functionName}`);

  try {
    const client = await auth.getIdTokenClient(url);
    const tokenResponse = await client.getRequestHeaders();
    const authHeader = tokenResponse.Authorization;

    const response = await axios.post(url, 
      { data }, 
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        timeout: 120000,
        responseType: 'arraybuffer', // Get raw bytes to bypass string decoding issues
      }
    );

    // Convert raw bytes to string
    const rawString = Buffer.from(response.data).toString('utf8');
    
    // THE FIX: Aggressively strip any non-JSON prefix (like 'null' or whitespace)
    const firstBrace = rawString.indexOf('{');
    const firstBracket = rawString.indexOf('[');
    const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

    if (startIdx === -1) {
        throw new Error(`Invalid non-JSON response: ${rawString.substring(0, 100)}`);
    }

    const jsonString = rawString.substring(startIdx);
    let result: any;
    
    try {
        result = JSON.parse(jsonString);
    } catch (parseError: any) {
        console.error(`[DEBUG] Final parse failed. Raw start: ${rawString.substring(0, 20)}`);
        throw parseError;
    }

    if (result && result.result !== undefined) {
      result = result.result;
    }

    return result || {};
  } catch (error: any) {
    console.error(`[DEBUG] FAILED function ${functionName}:`, error.message);
    throw error;
  }
}

import { GoogleAuth } from "google-auth-library";
import { initializeApp, getApp, getApps, App } from "firebase-admin/app";
import { credential } from "firebase-admin";

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

  console.log(`[FirebaseUtils] Calling function: ${functionName} at ${url}`);

  try {
    const client = await auth.getIdTokenClient(url);
    const response = await client.request({
      url,
      method: 'POST',
      data: { data },
      timeout: 120000, 
      responseType: 'text', // Get raw text to handle potential garbage prefixes like 'null'
    });

    const rawText = String(response.data);
    let result: any;

    try {
      // 1. Try standard parse first
      result = JSON.parse(rawText);
    } catch (e) {
      console.warn(`[FirebaseUtils] Direct JSON parse failed, attempting recovery for: ${rawText.substring(0, 50)}...`);
      
      // 2. Recovery: find the first { or [ and last } or ]
      const firstBrace = rawText.indexOf('{');
      const firstBracket = rawText.indexOf('[');
      const lastBrace = rawText.lastIndexOf('}');
      const lastBracket = rawText.lastIndexOf(']');

      const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
      const endIdx = (startIdx === firstBrace) ? lastBrace : lastBracket;

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const cleanedText = rawText.substring(startIdx, endIdx + 1);
        try {
          result = JSON.parse(cleanedText);
          console.log(`[FirebaseUtils] Successfully recovered JSON via substring extraction.`);
        } catch (innerError: any) {
          console.error(`[FirebaseUtils] Recovery parse failed: ${innerError.message}`);
          throw new Error(`Failed to parse function response: ${rawText.substring(0, 100)}`);
        }
      } else {
        throw new Error(`Invalid response format from function: ${rawText.substring(0, 100)}`);
      }
    }

    // Handle common Firebase/Genkit response wrapping
    if (result && result.result !== undefined) {
      result = result.result;
    } else if (result && result.data !== undefined && !result.category && !Array.isArray(result)) {
      result = result.data;
    }

    if (result === null || result === undefined) return {};
    
    return result;
  } catch (error: any) {
    console.error(`[FirebaseUtils] Error calling function ${functionName}:`, error.message);
    throw error;
  }
}

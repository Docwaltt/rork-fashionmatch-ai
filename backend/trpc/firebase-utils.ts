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
      responseType: 'json', // Native JSON parsing is the definitive fix for the position 4 error
    });

    let result = response.data;

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

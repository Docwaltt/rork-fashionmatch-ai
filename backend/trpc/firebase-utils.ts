import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth();

/**
 * Helper to call Firebase Cloud Functions from a Node.js environment
 * using authenticated HTTP requests. This bypasses limitations of the
 * Firebase Client SDK in Node.js and allows calling functions in different projects.
 */
export async function callFirebaseFunction(functionName: string, data: any) {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'closet-app-1337';

  // Allow direct URL override via env var: e.g. FUNCTION_ANALYZEIMAGE_URL
  // Using a more explicit mapping to avoid "no-dynamic-env-var" lint error
  let url: string | undefined;
  if (functionName === 'analyzeImage') url = process.env.FUNCTION_ANALYZEIMAGE_URL;
  if (functionName === 'suggestOutfit') url = process.env.FUNCTION_SUGGESTOUTFIT_URL;
  if (functionName === 'generateOutfitsFn') url = process.env.FUNCTION_GENERATEOUTFITSFN_URL;
  if (functionName === 'processClothingFn') url = process.env.FUNCTION_PROCESSCLOTHINGFN_URL;

  if (!url) {
    // Specific overrides based on known deployments
    if (functionName === 'analyzeImage' || functionName === 'processClothingFn' || functionName === 'analyze') {
      // Prioritize the custom Cloud Run URL if it exists, else fallback to standard pattern
      url = 'https://processclothingfn-pfc64ufnsq-uc.a.run.app';
    } else if (functionName === 'generateOutfitsFn' || functionName === 'suggestOutfit') {
      url = `https://us-central1-${projectId}.cloudfunctions.net/generateOutfitsFn`;
    } else {
      // Fallback pattern for Firebase Functions v2 / Cloud Run
      url = `https://${functionName}-pfc64ufnsq-uc.a.run.app`;
    }
  }

  console.log(`[FirebaseUtils] Calling function: ${functionName} at ${url}`);

  try {
    const client = await auth.getIdTokenClient(url);
    const response = await client.request({
      url,
      method: 'POST',
      data: { data }, // standard wrapper for Firebase Callable-like onRequest functions
      timeout: 300000, // 5 minutes timeout
    });

    // Recursive unwrapping to extract the actual payload from Genkit/Firebase structures
    let result = response.data;

    // Log raw response for debugging
    console.log(`[FirebaseUtils] Raw response keys:`, Object.keys(result || {}));

    let iterations = 0;
    while (result && (result.result !== undefined || result.data !== undefined) && iterations < 5) {
      result = result.result !== undefined ? result.result : result.data;
      iterations++;
    }

    return result;
  } catch (error: any) {
    console.error(`[FirebaseUtils] Error calling function ${functionName}:`, error.message);
    if (error.response) {
      console.error(`[FirebaseUtils] Response status: ${error.response.status}`);
      console.error(`[FirebaseUtils] Response data:`, JSON.stringify(error.response.data).substring(0, 500));
    }
    throw error;
  }
}

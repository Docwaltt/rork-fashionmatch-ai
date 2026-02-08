import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth();

/**
 * Helper to call Firebase Cloud Functions from a Node.js environment
 * using authenticated HTTP requests. This bypasses limitations of the
 * Firebase Client SDK in Node.js and allows calling functions in different projects.
 */
export async function callFirebaseFunction(functionName: string, data: any) {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'closet-app-1337';
  const region = process.env.FIREBASE_REGION || 'us-central1';

  // Allow direct URL override via env var: e.g. FUNCTION_ANALYZEIMAGE_URL
  let url: string | undefined;
  if (functionName === 'analyzeImage') url = process.env.FUNCTION_ANALYZEIMAGE_URL;
  if (functionName === 'suggestOutfit') url = process.env.FUNCTION_SUGGESTOUTFIT_URL;
  if (functionName === 'generateOutfitsFn') url = process.env.FUNCTION_GENERATEOUTFITSFN_URL;
  if (functionName === 'processClothingFn') url = process.env.FUNCTION_PROCESSCLOTHINGFN_URL;

  if (!url) {
    // Specific naming logic based on project conventions
    const isStandardCallable = functionName === 'analyzeImage';

    if (isStandardCallable) {
      // Standard Firebase v2 Callable URL pattern
      url = `https://${functionName}-pfc64ufnsq-uc.a.run.app`;
    } else if (functionName === 'generateOutfitsFn' || functionName === 'suggestOutfit') {
      url = `https://${region}-${projectId}.cloudfunctions.net/generateOutfitsFn`;
    } else if (functionName === 'processClothingFn' || functionName === 'analyze') {
      url = `https://processclothingfn-pfc64ufnsq-uc.a.run.app`;
    } else {
      // Default fallback
      url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
    }
  }

  console.log(`[FirebaseUtils] Calling function: ${functionName} at ${url}`);

  try {
    const client = await auth.getIdTokenClient(url);
    const response = await client.request({
      url,
      method: 'POST',
      data: { data }, // standard wrapper for Firebase Callable-like onRequest functions
      timeout: 120000, // 2 minutes timeout
    });

    // Recursive unwrapping to extract the actual payload from Genkit/Firebase structures
    let result: any = response.data;

    if (!result || typeof result !== 'object') {
       console.error(`[FirebaseUtils] Expected JSON object response, but got: ${typeof result}`);
       // If it's a string, it might be a non-JSON error message from the server
       if (typeof result === 'string' && result.includes('<html')) {
           throw new Error("Server returned an HTML error page. The function may have crashed or timed out.");
       }
       return result;
    }

    // Log raw response for debugging
    console.log(`[FirebaseUtils] Raw response keys:`, Object.keys(result));

    let iterations = 0;
    while (result && typeof result === 'object' && (result.result !== undefined || result.data !== undefined) && iterations < 5) {
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

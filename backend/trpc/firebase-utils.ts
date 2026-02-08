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

    // Log response type for diagnostics
    console.log(`[FirebaseUtils] Function ${functionName} responded with type: ${typeof result}`);

    if (result === null || result === undefined) {
      console.warn(`[FirebaseUtils] Function ${functionName} returned null/undefined`);
      return {};
    }

    if (typeof result !== 'object') {
       const resultStr = String(result);
       console.error(`[FirebaseUtils] Expected object, got: ${resultStr.substring(0, 500)}`);

       if (resultStr.includes('<html')) {
           throw new Error("Cloud Function returned an HTML error page. Check function logs for crashes.");
       }

       // Handle possible prepended 'null' or other garbage before/after JSON
       // Support both objects {} and arrays []
       const firstBrace = resultStr.indexOf('{');
       const firstBracket = resultStr.indexOf('[');
       const lastBrace = resultStr.lastIndexOf('}');
       const lastBracket = resultStr.lastIndexOf(']');

       // Determine if it's an object or array based on which delimiter comes first
       const isArray = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
       const startIdx = isArray ? firstBracket : firstBrace;
       const endIdx = isArray ? lastBracket : lastBrace;

       if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
           try {
               const jsonPart = resultStr.substring(startIdx, endIdx + 1);
               result = JSON.parse(jsonPart);
               console.log("[FirebaseUtils] Successfully recovered JSON from corrupted response");
           } catch (e) {
               console.error("[FirebaseUtils] Failed to recover JSON from response string. It might not be valid JSON.");
           }
       } else if (resultStr === "null") {
           console.warn("[FirebaseUtils] Function returned string 'null'. Returning empty object.");
           result = {};
       }
    }

    // If result is an array, return it directly without unwrapping
    if (Array.isArray(result)) {
      console.log(`[FirebaseUtils] Function ${functionName} returned array with ${result.length} items`);
      return result;
    }

    let iterations = 0;
    // Specific unwrapping for Firebase/Genkit structures
    while (result && typeof result === 'object' && iterations < 3) {
      if (result.result !== undefined) {
          result = result.result;
      } else if (result.data !== undefined && !result.category && !Array.isArray(result)) {
          // Only unwrap 'data' if it looks like a wrapper (not a result with a 'data' field)
          result = result.data;
      } else {
          break;
      }
      iterations++;
    }

    // Ensure we return an object if possible to avoid 'spreading a string' issues in callers
    return result !== null && result !== undefined ? result : {};
  } catch (error: any) {
    console.error(`[FirebaseUtils] Error calling function ${functionName}:`, error.message);
    if (error.response) {
      console.error(`[FirebaseUtils] Response status: ${error.response.status}`);
      const errorData = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
      console.error(`[FirebaseUtils] Response data:`, errorData.substring(0, 500));
    }
    throw error;
  }
}

import { GoogleAuth } from "google-auth-library";

const auth = new GoogleAuth();

/**
 * Helper to call Firebase Cloud Functions from a Node.js environment
 * using authenticated HTTP requests. This bypasses limitations of the
 * Firebase Client SDK in Node.js and allows calling functions in different projects.
 */
export async function callFirebaseFunction(functionName: string, data: any) {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'closet-app-1337';
  const region = 'us-central1';

  // Default URL for Firebase Functions (v2 usually follows this pattern)
  let url = `https://${functionName}-pfc64ufnsq-uc.a.run.app`; // Typical Cloud Run URL for Genkit/Firebase v2

  // Specific overrides based on memory and known deployments
  if (functionName === 'analyzeImage' || functionName === 'processClothingFn' || functionName === 'analyze') {
    url = 'https://processclothingfn-pfc64ufnsq-uc.a.run.app';
  } else if (functionName === 'generateOutfitsFn' || functionName === 'suggestOutfit') {
    // Standardizing on Cloud Run URL for consistency with processclothingfn
    url = 'https://generateoutfitsfn-pfc64ufnsq-uc.a.run.app';
  } else {
    // Fallback pattern
    url = `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
  }

  const startTime = Date.now();
  // Calculate approximate payload size (for debugging)
  const payloadSize = JSON.stringify(data).length;
  console.log(`[FirebaseUtils] Calling function: ${functionName} at ${url} | Payload: ~${(payloadSize / 1024).toFixed(2)}KB`);

  try {
    const client = await auth.getIdTokenClient(url);
    const response = await client.request({
      url,
      method: 'POST',
      data: { data }, // standard wrapper for Firebase Callable-like onRequest functions
      timeout: 300000, // 5 minutes timeout
    });

    const duration = Date.now() - startTime;
    console.log(`[FirebaseUtils] Function ${functionName} responded in ${duration}ms | Status: ${response.status}`);

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

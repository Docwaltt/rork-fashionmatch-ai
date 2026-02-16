import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { processClothing } from './analysis.js';
import { generateOutfits } from './suggestions.js';

// Initialize Firebase Admin
initializeApp();

// Define Secrets
const googleGenAiApiKey = defineSecret('GOOGLE_GENAI_API_KEY');
const clipdropApiKey = defineSecret('CLIPDROP_API_KEY');
const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

// Deployment Marker: 2026-02-11T12:00:00

/**
 * Callable Function for direct, authenticated use from the Mobile App.
 */
export const processClothingCallable = onCall({
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'us-central1',
  invoker: 'public', 
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (request) => {
  try {
    const input = request.data;
    const imgData = input?.imgData || input?.image || input?.imageUrl;

    if (!imgData) {
      throw new HttpsError('invalid-argument', "Missing image data.");
    }

    console.log("[CALLABLE] processClothing START");
    const result = await processClothing.run({ ...input, imgData });
    return result;
  } catch (error: any) {
    console.error("[CALLABLE] processClothing error:", error);
    throw new HttpsError('internal', error.message);
  }
});

export const generateOutfitsCallable = onCall({
  memory: '2GiB',
  timeoutSeconds: 540,
  region: 'us-central1',
  invoker: 'public',
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (request) => {
  try {
    console.log("[CALLABLE] generateOutfits START");
    const result = await generateOutfits.run(request.data);
    return result;
  } catch (error: any) {
    console.error("[CALLABLE] generateOutfits error:", error);
    throw new HttpsError('internal', error.message);
  }
});

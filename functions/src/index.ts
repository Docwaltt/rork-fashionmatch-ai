import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { processClothing } from './analysis.js';
import { generateOutfits, generateOutfitImage } from './suggestions.js';

// Initialize Firebase Admin
initializeApp({
  storageBucket: 'dressya-6ff56.appspot.com',
});

// Define Secrets
const googleGenAiApiKey = defineSecret('GOOGLE_GENAI_API_KEY');
const clipdropApiKey = defineSecret('CLIPDROP_API_KEY');
const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

// Deployment Marker: 2026-02-16T16:00:00

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
  timeoutSeconds: 300, // Reduced as we decoupled image generation
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

/**
 * Specialized function to merge images into a single outfit.
 * Decoupled to prevent timeout in the main suggestions flow.
 */
export const mergeOutfitImagesCallable = onCall({
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'us-central1',
  invoker: 'public',
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (request) => {
  try {
    console.log("[CALLABLE] mergeOutfitImages START");
    const items = request.data.items;
    if (!items || !Array.isArray(items)) {
        throw new HttpsError('invalid-argument', "Missing or invalid items array.");
    }
    const result = await generateOutfitImage.run(items);
    return { imageUrl: result };
  } catch (error: any) {
    console.error("[CALLABLE] mergeOutfitImages error:", error);
    throw new HttpsError('internal', error.message);
  }
});

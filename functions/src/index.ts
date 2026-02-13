import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
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

// Export generateOutfits as an HTTP function for more control
export const generateOutfitsFn = onRequest({
  memory: '2GiB',
  timeoutSeconds: 540, // Increased timeout
  region: 'us-central1',
  invoker: 'public',
  cors: true, // Enable CORS for direct client calls
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (req: Request, res: Response) => {
  try {
    // Standardize input extraction: tRPC sends { data }
    const input = req.body.data || req.body;
    
    console.log("Starting generateOutfits flow...");
    const result = await generateOutfits.run(input);
    
    res.status(200).json({ result }); 
  } catch (error: any) {
    console.error("generateOutfitsFn error:", error);
    res.status(500).json({ error: { message: error.message } });
  }
});

// HTTP Function (for usage via tRPC backend or raw HTTP fetch)
export const processClothingFn = onRequest({
  memory: '2GiB',
  minInstances: 0,
  timeoutSeconds: 300,
  region: 'us-central1',
  cors: true,
  invoker: 'public', // Allow unauthenticated access
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey], // Bind secrets
}, async (req: Request, res: Response) => {
  try {
    // Standardize input extraction: tRPC sends { data } which contains { imgData, gender }
    const input = req.body.data || req.body;

    if (!input || !input.imgData) {
      console.error("Missing imgData in input:", Object.keys(input || {}));
      res.status(400).json({ error: "Missing image data. Expected 'imgData' field." });
      return;
    }

    // Invoke the Genkit flow directly
    console.log("Starting processClothing flow...");
    const result = await processClothing.run(input);
    
    // Always wrap in a 'result' key for consistency with Firebase Callable patterns
    // and ensuring valid JSON is returned to the tRPC client.
    res.status(200).json({ result });
  } catch (error: any) {
    console.error("Error in processClothingFn execution:", error);
    res.status(500).json({ 
      error: { message: error.message }
    });
  }
});

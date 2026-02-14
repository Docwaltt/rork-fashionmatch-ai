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
  timeoutSeconds: 540, 
  region: 'us-central1',
  invoker: 'public',
  cors: true, 
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (req: Request, res: Response) => {
  try {
    // Ultra-flexible input parsing
    let input = req.body.data || req.body;
    if (typeof input === 'string') {
        try { input = JSON.parse(input); } catch(e) {}
    }
    
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
  invoker: 'public', 
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey], 
}, async (req: Request, res: Response) => {
  try {
    // Ultra-flexible input parsing to handle different tRPC client/backend quirks
    let input = req.body;
    
    // 1. Unwrap 'data' if it exists (Firebase Callable convention)
    if (input && input.data) input = input.data;
    
    // 2. Handle stringified body
    if (typeof input === 'string') {
        try { input = JSON.parse(input); } catch(e) {}
    }

    // 3. Final normalization of the image field
    const imgData = input?.imgData || input?.image || input?.imageUrl || input?.data;

    if (!imgData) {
      console.error("DEBUG: Input data missing image field. Body received:", JSON.stringify(req.body).substring(0, 200));
      res.status(400).json({ error: "Missing image data. Expected 'imgData' field." });
      return;
    }

    console.log("Starting processClothing flow...");
    const result = await processClothing.run({ ...input, imgData });
    res.status(200).json({ result });
  } catch (error: any) {
    console.error("Error in processClothingFn execution:", error);
    res.status(500).json({ 
      error: { message: error.message }
    });
  }
});

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { processClothing, generateOutfits } from './genkit.js';

// Define Secrets
const googleGenAiApiKey = defineSecret('GOOGLE_GENAI_API_KEY');
const clipdropApiKey = defineSecret('CLIPDROP_API_KEY');
const googleServiceAccountEmail = defineSecret('GOOGLE_SERVICE_ACCOUNT_EMAIL');
const googlePrivateKey = defineSecret('GOOGLE_PRIVATE_KEY');

// 1. Callable Function (for direct usage from App via SDK)
export const analyzeImage = onCall({
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'us-central1',
  invoker: 'public', // Allow unauthenticated access
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (request) => {
  try {
    console.log("analyzeImage called. Request data keys:", Object.keys(request.data || {}));
    
    // Log if secrets are available (without logging values)
    console.log("GOOGLE_GENAI_API_KEY available:", !!googleGenAiApiKey.value());
    console.log("CLIPDROP_API_KEY available:", !!clipdropApiKey.value());
    
    // Check input payload structure
    const input = request.data;
    if (input && (input.imgData || input.image)) {
        console.log("Image data present. Length:", (input.imgData || input.image).length);
    } else {
        console.warn("WARNING: No image data found in request!");
    }

    const result = await processClothing.run(request.data);
    console.log("processClothing result:", JSON.stringify(result).substring(0, 500) + "...");
    return result;
  } catch (error: any) {
    console.error("analyzeImage error:", error);
    throw new HttpsError('internal', error.message, error);
  }
});

// Export generateOutfits as an HTTP function for more control
export const generateOutfitsFn = onRequest({
  memory: '2GiB',
  timeoutSeconds: 540, // Increased timeout
  region: 'us-central1',
  invoker: 'public',
  cors: true, // Enable CORS for direct client calls
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey],
}, async (req: Request, res: Response) => {
  console.log("generateOutfitsFn (onRequest) called. Body keys:", Object.keys(req.body || {}));
  try {
    // The tRPC client for onRequest will wrap the input in a 'data' object.
    const input = req.body.data;
    
    const result = await generateOutfits.run(input);
    
    console.log(`[generateOutfitsFn] Received ${Array.isArray(result) ? result.length : 'non-array'} suggestions from flow.`);
    
    // For onRequest, we need to send the response back manually.
    res.status(200).json(result);
  } catch (error: any) {
    console.error("generateOutfitsFn error:", error);
    res.status(500).json({ error: { message: error.message } }); // tRPC error format
  }
});

// 2. HTTP Function (for usage via tRPC backend or raw HTTP fetch)
export const processClothingFn = onRequest({
  memory: '4GiB',
  timeoutSeconds: 300,
  region: 'us-central1',
  cors: true,
  invoker: 'public', // Allow unauthenticated access
  secrets: [googleGenAiApiKey, clipdropApiKey, googleServiceAccountEmail, googlePrivateKey], // Bind secrets
}, async (req: Request, res: Response) => {
  // Debug Logging
  console.log("Request received. Headers:", JSON.stringify(req.headers));
  console.log("Body type:", typeof req.body);
  console.log("Body keys:", req.body ? Object.keys(req.body) : "null");

  // Normalize input from various formats
  let input = req.body;

  // Handle cases where body might not be parsed automatically
  if (typeof input === 'string' && input.trim().startsWith('{')) {
    try {
      input = JSON.parse(input);
    } catch (e) {
      console.log("Failed to parse body string as JSON");
    }
  }

  // If wrapped in "data" (Callable format), unwrap it
  // But be careful not to unwrap if 'data' IS the payload (e.g. image string)
  if (input && typeof input === 'object' && input.data && !input.imgData && !input.image) {
    input = input.data;
  }

  // Map potential field names to 'imgData'
  if (input && typeof input === 'object') {
    if (!input.imgData && input.image) input.imgData = input.image;
    if (!input.imgData && input.imageUrl) input.imgData = input.imageUrl;
    if (!input.imgData && input.imageBase64) input.imgData = input.imageBase64;
  }

  if (!input || !input.imgData) {
    console.error("Missing imgData in input:", Object.keys(input || {}));
    res.status(400).json({ error: "Missing image data. Expected 'image', 'imageBase64', or 'imgData' field." });
    return;
  }

  try {
    // Invoke the Genkit flow directly
    const result = await processClothing.run(input);
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in processClothingFn execution:", error);
    res.status(500).json({ 
      error: error.message,
      details: "Check function logs for more info"
    });
  }
});

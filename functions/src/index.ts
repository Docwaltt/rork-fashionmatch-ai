import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { processClothing, generateOutfits } from './genkit.js';

// 1. Callable Function (for direct usage from App via SDK)
export const analyzeImage = onCall({
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'us-central1'
}, async (request) => {
  try {
    const result = await processClothing.run(request.data);
    return result;
  } catch (error: any) {
    throw new HttpsError('internal', error.message);
  }
});

// Export generateOutfits as a callable function
export const generateOutfitsFn = onCall({
  memory: '2GiB',
  timeoutSeconds: 300,
  region: 'us-central1'
}, async (request) => {
  try {
    const result = await generateOutfits.run(request.data);
    return result;
  } catch (error: any) {
    throw new HttpsError('internal', error.message);
  }
});

// 2. HTTP Function (for usage via tRPC backend or raw HTTP fetch)
export const processClothingFn = onRequest({
  memory: '4GiB', // Increased memory for background removal
  timeoutSeconds: 300,
  region: 'us-central1',
  cors: true, 
}, async (req: Request, res: Response) => {
  // Debug Logging
  console.log("Request received. Headers:", JSON.stringify(req.headers));
  console.log("Body type:", typeof req.body);
  console.log("Body keys:", req.body ? Object.keys(req.body) : "null");

  // Normalize input from various formats
  let input = req.body;

  // Handle cases where body might not be parsed automatically
  if (typeof input === 'string') {
    try {
      input = JSON.parse(input);
    } catch (e) {
      console.log("Failed to parse body string");
    }
  }

  // If wrapped in "data" (Callable format), unwrap it
  if (input && typeof input === 'object' && input.data) {
    input = input.data;
  }

  // Map potential field names to 'imgData'
  if (input && typeof input === 'object') {
    if (input.image) {
      input.imgData = input.image;
    }
    if (input.imageBase64) {
      input.imgData = input.imageBase64;
    }
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

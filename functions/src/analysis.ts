
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { ai, ClothingSchema } from './genkit.js';

const clipdropApiKey = process.env.CLIPDROP_API_KEY;

async function removeBackgroundWithClipdrop(imageBuffer: Buffer): Promise<Buffer> {
  if (!clipdropApiKey) {
    console.warn("WARNING: CLIPDROP_API_KEY is not set. Background removal will be skipped.");
    throw new Error("CLIPDROP_API_KEY is not set.");
  }
  
  const formData = new FormData();
  formData.append('image_file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); 

  const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: { 'x-api-key': clipdropApiKey },
    body: formData,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clipdrop API failed: ${response.status} ${errorText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToStorage(buffer: Buffer, contentType: string): Promise<string> {
    let bucket = getStorage().bucket();
    if (!bucket.name) {
        const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
        if (projectId) {
            bucket = getStorage().bucket(`${projectId}.appspot.com`);
        }
    }

    if (!bucket.name) {
        throw new Error("Could not determine storage bucket name.");
    }

    const fileName = `temp_cleaned/${randomUUID()}.png`;
    const file = bucket.file(fileName);
    const downloadToken = randomUUID();

    await file.save(buffer, {
        metadata: {
            contentType,
            metadata: {
                firebaseStorageDownloadTokens: downloadToken
            }
        },
    });

    const encodedFileName = encodeURIComponent(fileName);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFileName}?alt=media&token=${downloadToken}`;
}

export const processClothing = ai.defineFlow(
  {
    name: 'processClothing',
    inputSchema: z.any(),
    outputSchema: z.any(),
  },
  async (inputData: any) => {
    let imageUri = inputData?.imgData || inputData?.image || inputData?.data || (typeof inputData === 'string' ? inputData : "");

    if (!imageUri) {
       return { error: "No image data provided" };
    }

    let cleanedImageUrl: string | undefined;
    let isBackgroundRemoved = false;
    let imageForGemini = imageUri;

    try {
      const base64Part = imageUri.includes(',') ? imageUri.split(',')[1] : imageUri;
      const cleanBase64 = base64Part.replace(/\s/g, '');
      let inputBuffer = Buffer.from(cleanBase64, 'base64');

      if (inputBuffer.length === 0) throw new Error("Input image buffer is empty");

      const cleanedBuffer = await removeBackgroundWithClipdrop(inputBuffer);
      isBackgroundRemoved = true;

      cleanedImageUrl = await uploadToStorage(cleanedBuffer, 'image/png');

      imageForGemini = `data:image/png;base64,${cleanedBuffer.toString('base64')}`;
    } catch (error: any) {
      console.error("LOG: Background removal failed. Using original image. Error:", error.message);
      imageForGemini = imageUri; 
    }

    try {
      // Switching back to Gemini 3 as per your requirement
      console.log(`LOG: Sending to Gemini with model gemini-3-flash-preview...`);
      
      const response = await ai.generate({
        model: googleAI.model('gemini-3-flash-preview'),
        prompt: [
          { text: "Analyze the clothing item in the image. Extract the category, color, style, material, fabric, pattern, texture, silhouette, material type, and pattern description. Determine if it has a pattern. Provide your confidence score." },
          { media: { url: imageForGemini } },
        ],
        output: { schema: ClothingSchema },
        config: { responseMimeType: 'application/json' },
      });

      const result = response.output;
      if (!result) {
        throw new Error("Empty AI response");
      }
      
      console.log(`LOG: Gemini output: ${JSON.stringify(result).substring(0, 500)}`);

      delete (result as any).imageUri;
      delete (result as any).cleanedImage;

      const finalResponse = {
          ...result,
          cleanedImage: cleanedImageUrl,
          cleanedImageUrl: cleanedImageUrl,
          isBackgroundRemoved
      };
      return finalResponse;

    } catch (geminiError: any) {
      console.error("LOG: Gemini analysis failed:", geminiError.message);
      return { error: `AI Analysis Failed: ${geminiError.message}`, isBackgroundRemoved, cleanedImage: cleanedImageUrl };
    }
  }
);

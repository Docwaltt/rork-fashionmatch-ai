
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Enhanced logging to check for API keys at startup
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn("CRITICAL: GOOGLE_GENAI_API_KEY is not set.");
} else {
  console.log("GOOGLE_GENAI_API_KEY is configured.");
}
const clipdropApiKey = process.env.CLIPDROP_API_KEY;
if (!clipdropApiKey) {
    console.warn("WARNING: CLIPDROP_API_KEY is not set. Background removal will be skipped.");
}

export const ClothingSchema = z.object({
  id: z.string().optional().describe('Unique ID for the clothing item'),
  category: z.string().describe('Type of item (e.g., Denim Jacket, T-Shirt, Jeans)'),
  color: z.string().describe('Primary color detected'),
  style: z.string().describe('Fashion style (e.g., Casual, Formal, Vintage, Streetwear)'),
  confidence: z.number().describe('AI certainty score from 0 to 1'),
  cleanedImage: z.string().optional().describe('Base64 string of the image with background removed'),
  isBackgroundRemoved: z.boolean().describe('Whether the background removal process was successful'),
  fabric: z.string().optional().describe('Fabric texture (e.g., knit, denim, silk, cotton, leather)'),
  texture: z.string().optional().describe('Visual texture of the fabric (e.g., smooth, ribbed, fuzzy, bumpy)'),
  silhouette: z.string().optional().describe('Item silhouette (e.g., oversized, tailored, A-line, slim)'),
  materialType: z.string().optional().describe('Material of the cloth (e.g., Cotton, Polyester, Wool)'),
  hasPattern: z.boolean().optional().describe('Whether the cloth has patterns or not'),
  patternDescription: z.string().optional().describe('A description of the pattern if it exists (e.g., floral, striped, plaid)'),
});

const ai = genkit({ 
  plugins: [googleAI()],
});

async function removeBackgroundWithClipdrop(imageBuffer: Buffer): Promise<string> {
  if (!clipdropApiKey) throw new Error("CLIPDROP_API_KEY is not set.");
  
  const formData = new FormData();
  // Correctly create a Blob from the Buffer for Fetch API
  formData.append('image_file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg');

  console.log("LOG: Calling Clipdrop API...");
  const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: { 'x-api-key': clipdropApiKey },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`LOG: Clipdrop API failed: ${response.status}`, errorText);
    throw new Error(`Clipdrop API failed: ${response.status} ${errorText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  console.log("LOG: Clipdrop API success. Received buffer of size:", arrayBuffer.byteLength);
  return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
}

export const processClothing = ai.defineFlow(
  {
    name: 'processClothing',
    inputSchema: z.any(),
    outputSchema: z.any(),
  },
  async (inputData: any) => {
    console.log("LOG: processClothing flow started. Received input type:", typeof inputData);
    console.log("LOG: Raw input data:", JSON.stringify(inputData).substring(0, 200)); // Log first 200 chars

    let imageUri = inputData?.imgData || inputData?.image || inputData?.data || (typeof inputData === 'string' ? inputData : "");

    if (!imageUri) {
       console.error("LOG: No image data found in input.");
       return { error: "No image data provided" };
    }

    console.log("LOG: Extracted image URI (first 100 chars):", imageUri.substring(0, 100));

    let cleanedImageBase64: string | undefined;
    let isBackgroundRemoved = false;
    let imageForGemini = imageUri;

    try {
      let inputBuffer: Buffer;
      if (imageUri.startsWith('http')) {
        const response = await fetch(imageUri);
        inputBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        inputBuffer = Buffer.from(imageUri.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      }
      console.log(`LOG: Created buffer of size ${inputBuffer.length} for background removal.`);

      cleanedImageBase64 = await removeBackgroundWithClipdrop(inputBuffer);
      isBackgroundRemoved = true;
      imageForGemini = cleanedImageBase64;
      console.log("LOG: Background removed. Using cleaned image for Gemini.");

    } catch (error: any) {
      console.error("LOG: Background removal failed. Using original image. Error:", error.message);
      imageForGemini = imageUri; 
    }

    try {
      console.log(`LOG: Sending to Gemini with model gemini-3-pro-image-preview...`);
      
      const response = await ai.generate({
        model: googleAI.model('gemini-3-pro-image-preview'), // Correct model for image analysis
        prompt: [
          { text: "Analyze the clothing item in the image. Extract category, color, style, fabric, texture, silhouette, and material type." },
          { media: { url: imageForGemini } },
        ],
        output: { schema: ClothingSchema },
      });

      const result = response.output;
      if (!result) {
        console.error("LOG: Gemini returned an empty response.");
        throw new Error("Empty AI response");
      }
      console.log("LOG: Gemini analysis successful. Raw result:", JSON.stringify(result));
      
      const finalResponse = {
        ...result,
        cleanedImage: cleanedImageBase64,
        isBackgroundRemoved
      };

      console.log("LOG: Sending final response to client:", JSON.stringify(finalResponse));
      return finalResponse;

    } catch (geminiError: any) {
      console.error("LOG: Gemini analysis failed:", geminiError.message, geminiError.stack);
      return { 
        error: `AI Analysis Failed: ${geminiError.message}`,
        isBackgroundRemoved,
        cleanedImage: cleanedImageBase64 
      };
    }
  }
);

// Moved OutfitSuggestionSchema before its use in generateOutfits
export const OutfitSuggestionSchema = z.object({
  title: z.string().describe('A catchy title for the outfit suggestion.'),
  description: z.string().describe('A brief description of the outfit and why it works.'),
  items: z.array(z.string()).describe('An array of item IDs that make up the outfit.'),
});

export const generateOutfits = ai.defineFlow(
  {
    name: 'generateOutfits',
    inputSchema: z.array(ClothingSchema),
    outputSchema: z.array(OutfitSuggestionSchema), // Now this is valid
  },
  async (wardrobe: any) => {
    if (wardrobe.length < 2) {
      return [];
    }

    console.log("Generating outfits with text analysis model...");
    const response = await ai.generate({
      model: googleAI.model('gemini-3-pro-preview'), // Correct model for text generation
      prompt: [
        {
          text: `
            Create 3-5 stylish outfits from the provided wardrobe items.
            Wardrobe: ${JSON.stringify(wardrobe, null, 2)}
          `,
        },
      ],
      output: { schema: z.array(OutfitSuggestionSchema) },
    });

    return response.output || [];
  }
);


import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Last-step verification of API keys
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
  imageUri: z.string().optional().describe('The original Base64 URI of the image.'),
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
  formData.append('image_file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' }), 'image.jpg');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

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
  return `data:image/png;base64,${Buffer.from(arrayBuffer).toString('base64')}`;
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

    let cleanedImageBase64: string | undefined;
    let isBackgroundRemoved = false;
    let imageForGemini = imageUri;

    try {
      let inputBuffer = Buffer.from(imageUri.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      cleanedImageBase64 = await removeBackgroundWithClipdrop(inputBuffer);
      isBackgroundRemoved = true;
      imageForGemini = cleanedImageBase64;
    } catch (error: any) {
      console.error("LOG: Background removal failed. Using original image. Error:", error.message);
      imageForGemini = imageUri; 
    }

    try {
      console.log(`LOG: Sending to Gemini with model gemini-3-pro-image-preview...`);
      
      const response = await ai.generate({
        model: googleAI.model('gemini-3-pro-image-preview'),
        config: {
          // Setting thinkingLevel to LOW as MEDIUM is reported as unsupported in logs
          // @ts-ignore
          thinkingConfig: { thinkingLevel: 'LOW' },
        } as any,
        prompt: [
          { text: "Analyze the clothing item in the image. Extract category, color, style, fabric, texture, silhouette, and material type." },
          { media: { url: imageForGemini } },
        ],
        output: { schema: ClothingSchema },
      });

      const result = response.output;
      if (!result) {
        throw new Error("Empty AI response");
      }
      
      return { ...result, imageUri, cleanedImage: cleanedImageBase64, isBackgroundRemoved };

    } catch (geminiError: any) {
      console.error("LOG: Gemini analysis failed:", geminiError.message, geminiError.stack);
      return { error: `AI Analysis Failed: ${geminiError.message}`, isBackgroundRemoved, cleanedImage: cleanedImageBase64 };
    }
  }
);

export const OutfitSuggestionSchema = z.object({
  title: z.string().describe('A catchy title for the outfit suggestion.'),
  description: z.string().describe('A brief, one-sentence description of the outfit.'),
  reason: z.string().describe('A detailed explanation for why this outfit is a good fashion match, considering color theory, style harmony, and occasion suitability.'),
  items: z.array(z.string()).describe('An array of item IDs that make up the outfit.'),
  generatedImageUrl: z.string().optional().describe('URL of the generated outfit image'),
});

export const generateOutfitImage = ai.defineFlow(
  {
    name: 'generateOutfitImage',
    inputSchema: z.array(ClothingSchema),
    outputSchema: z.string(),
  },
  async (items: z.infer<typeof ClothingSchema>[]) => {
    if (items.length === 0) {
      return "";
    }

    const imageParts = items.map(item => {
        const imageUrl = item.cleanedImage || item.imageUri;
        if (!imageUrl) {
            console.error(`[generateOutfitImage] CRITICAL: Item with ID ${item.id} has no cleanedImage or imageUri. Cannot generate outfit.`);
            return null;
        }
        return { media: { url: imageUrl } };
    }).filter((part): part is { media: { url: string } } => part !== null);

    if (imageParts.length !== items.length) {
        throw new Error("Could not generate outfit image because some items were missing image data.");
    }

    const response = await ai.generate({
        model: googleAI.model('gemini-3-pro-image-preview'),
        config: {
            // @ts-ignore
            thinkingConfig: { thinkingLevel: 'LOW' },
        } as any,
        prompt: [
            { text: "Create a realistic flat lay image of a complete outfit, arranging the provided clothing items logically from top to bottom. Ensure the final image is stylish and visually appealing, on a clean, neutral background." },
            ...imageParts,
        ],
        output: { format: 'uri' },
    });

    return response.output || "";
  }
);

export const generateOutfits = ai.defineFlow(
  {
    name: 'generateOutfits',
    inputSchema: z.object({
      wardrobe: z.array(ClothingSchema),
      numSuggestions: z.number().optional().default(2),
      event: z.string().optional(),
    }),
    outputSchema: z.array(OutfitSuggestionSchema),
  },
  async ({ wardrobe, numSuggestions, event }) => {
    console.log(`[generateOutfits] Starting flow for ${wardrobe.length} items for event ${event || 'unspecified'}. Requesting ${numSuggestions} suggestions.`);
    if (wardrobe.length < 2) {
      console.log('[generateOutfits] Wardrobe has less than 2 items. Returning empty array.');
      return [];
    }

    // Strip large image data from wardrobe items to prevent massive prompts and timeouts
    const cleanWardrobe = (wardrobe || []).map((item: any) => {
      const { imageUri, cleanedImage, thumbnailUri, ...rest } = item;
      return rest;
    });

    const promptText = `Create ${numSuggestions} stylish and complete outfits for a ${event || 'general'} occasion using the provided wardrobe items.
    An outfit should ideally consist of a top and a bottom, or a dress and shoes, etc.
    Be creative and try to suggest the best possible combinations for a ${event || 'general'} setting even if the wardrobe is limited.
    For each outfit, provide:
    1. A catchy title.
    2. A brief one-sentence description.
    3. A detailed reasoning (3-4 sentences) about color theory, style harmony, and suitability for the ${event || 'general'} occasion.
    4. The list of exact item IDs used in the outfit.

    Wardrobe items: ${JSON.stringify(cleanWardrobe, null, 2)}`;
    console.log('[generateOutfits] Prompt text created. Length:', promptText.length);

    try {
        const response = await ai.generate({
          model: googleAI.model('gemini-3-pro-preview'),
          config: {
            // @ts-ignore
            thinkingConfig: { thinkingLevel: 'LOW' },
          } as any,
          prompt: [
            {
              text: promptText
            },
          ],
          output: { schema: z.array(OutfitSuggestionSchema) },
        });

        const suggestions = response.output || [];
        console.log(`[generateOutfits] Received ${suggestions.length} suggestions from AI.`);
        if (suggestions.length === 0) {
            console.warn('[generateOutfits] AI returned 0 suggestions. Response:', JSON.stringify(response, null, 2));
        }

        // Disabled image generation because Gemini 3 Pro is a multimodal model (understanding images)
        // but not an image generation model (like Imagen). Using it for image generation output
        // was causing the indefinite hangs (9+ minutes) and timeouts reported.
        // The app will now return suggestions instantly and use the frontend grid fallback.
        for (const suggestion of suggestions) {
          suggestion.generatedImageUrl = "";
        }
        console.log('[generateOutfits] Flow completed successfully.');
        return suggestions;

    } catch(error: any) {
        console.error('[generateOutfits] CRITICAL ERROR during ai.generate call:', error.message, error.stack);
        return []; 
    }
  }
);

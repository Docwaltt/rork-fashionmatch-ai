
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { ai, ClothingSchema } from './genkit.js';

export const OutfitSuggestionSchema = z.object({
  title: z.string().describe('A catchy title for the outfit suggestion.'),
  description: z.string().describe('A brief, one-sentence description of the outfit.'),
  reason: z.string().describe('A concise explanation (strictly under 30 words) for why this outfit works.'),
  items: z.array(z.string()).describe('An array of item IDs that make up the outfit.'),
  generatedImageUrl: z.string().optional().describe('URL of the generated outfit image'),
});

export const generateOutfitImage = ai.defineFlow(
  {
    name: 'generateOutfitImage',
    inputSchema: z.array(z.any()), // More flexible input for merging
    outputSchema: z.string(),
  },
  async (items: any[]) => {
    if (items.length === 0) return "";

    const imageParts = items.map(item => {
        const imageUrl = item.cleanedImageUrl || item.cleanedImage || item.imageUri;
        if (!imageUrl) return null;
        return { media: { url: imageUrl } };
    }).filter((part): part is { media: { url: string } } => part !== null);

    if (imageParts.length === 0) throw new Error("No valid image data for merging.");

    const response = await ai.generate({
        model: googleAI.model('gemini-3-pro-image-preview'),
        prompt: [
            { text: "Generate a high-quality fashion flat lay image of these specific clothing items. Arrange them vertically as if an invisible person is wearing them (tops above bottoms, shoes at the bottom). Merge them into a single cohesive outfit image on a minimal, high-end, neutral studio background. The result should look like a professional e-commerce product shot." },
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
    console.log(`[generateOutfits] Logic-only flow for ${wardrobe.length} items.`);
    if (wardrobe.length < 2) return [];

    // Strip images to keep the prompt light and fast
    const cleanWardrobe = wardrobe.map((item: any) => {
      const { imageUri, cleanedImage, cleanedImageUrl, ...rest } = item;
      return rest;
    });

    const promptText = `Create ${numSuggestions} stylish and complete outfits for a ${event || 'general'} occasion.
    Provide:
    1. A catchy title.
    2. A one-sentence description.
    3. A VERY CONCISE reasoning (STRICTLY MAX 30 WORDS).
    4. The list of exact item IDs used.

    Wardrobe: ${JSON.stringify(cleanWardrobe, null, 2)}`;

    try {
        const response = await ai.generate({
          model: googleAI.model('gemini-3-pro-preview'),
          prompt: [{ text: promptText }],
          output: { schema: z.array(OutfitSuggestionSchema) },
          config: { responseMimeType: 'application/json' },
        });

        // NOTE: We no longer generate images here to prevent timeouts.
        // The mobile app will now call the image merging separately.
        return response.output || [];

    } catch(error: any) {
        console.error('[generateOutfits] flow failed:', error.message);
        return []; 
    }
  }
);

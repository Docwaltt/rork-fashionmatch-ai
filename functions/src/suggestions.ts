
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { ai, ClothingSchema } from './genkit.js';

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
        model: googleAI.model('gemini-3-flash-preview'),
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
          prompt: [
            {
              text: promptText
            },
          ],
          output: { schema: z.array(OutfitSuggestionSchema) },
          config: { responseMimeType: 'application/json' },
        });

        const suggestions = response.output || [];
        console.log(`[generateOutfits] Received ${suggestions.length} suggestions from AI.`);
        if (suggestions.length === 0) {
            console.warn('[generateOutfits] AI returned 0 suggestions. Response:', JSON.stringify(response, null, 2));
        }

        // Image generation is now enabled
        for (const suggestion of suggestions) {
           try {
             const suggestionItems = wardrobe.filter(item => suggestion.items.includes(item.id as string));
             suggestion.generatedImageUrl = await generateOutfitImage(suggestionItems);
           } catch (error) {
             console.error("[generateOutfits] Image generation failed for suggestion:", suggestion.title, error);
             suggestion.generatedImageUrl = "";
           }
        }
        
        console.log('[generateOutfits] Flow completed successfully.');
        return suggestions;

    } catch(error: any) {
        console.error('[generateOutfits] CRITICAL ERROR during ai.generate call:', error.message, error.stack);
        return []; 
    }
  }
);

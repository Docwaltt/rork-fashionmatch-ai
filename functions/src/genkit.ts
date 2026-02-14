import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ClothingSchema = z.object({
  id: z.string().optional().describe('Unique ID for the clothing item'),
  imageUri: z.string().optional().describe('The original Base64 URI of the image.'),
  category: z.string().describe('Type of item (e.g., Denim Jacket, T-Shirt, Jeans)'),
  color: z.string().describe('Primary color detected'),
  style: z.string().describe('Fashion style (e.g., Casual, Formal, Vintage, Streetwear)'),
  confidence: z.number().describe('AI certainty score from 0 to 1'),
  cleanedImage: z.string().optional().describe('Base64 string or URL of the image with background removed'),
  isBackgroundRemoved: z.boolean().describe('Whether the background removal process was successful'),
  material: z.string().optional().describe('The material of the item (e.g., Denim, Leather, Wool)'),
  fabric: z.string().optional().describe('Fabric texture (e.g., knit, woven, silk, cotton)'),
  pattern: z.string().optional().describe('Pattern type (e.g., Solid, Striped, Plaid)'),
  texture: z.string().optional().describe('Visual texture (e.g., smooth, ribbed, fuzzy)'),
  silhouette: z.string().optional().describe('Item silhouette (e.g., oversized, tailored, slim)'),
  materialType: z.string().optional().describe('Nature of material (e.g., Synthetic, Natural)'),
  hasPattern: z.boolean().optional().describe('Whether the cloth has patterns or not'),
  patternDescription: z.string().optional().describe('Detailed description of the pattern'),
});

// Explicitly pass the API key to the plugin for reliable initialization.
// The key is securely retrieved from the environment secret during function execution.
export const ai = genkit({ 
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
});

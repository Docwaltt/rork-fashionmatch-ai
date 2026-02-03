import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Check for API Key availability
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GOOGLE_GENAI_API_KEY is not set in environment variables. Genkit may fail.");
} else {
  console.log("GOOGLE_GENAI_API_KEY found (length: " + apiKey.length + ")");
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
  silhouette: z.string().optional().describe('Item silhouette (e.g., oversized, tailored, A-line, slim)'),
  materialType: z.string().optional().describe('Material of the cloth (e.g., Cotton, Polyester, Wool)'),
  hasPattern: z.boolean().optional().describe('Whether the cloth has patterns or not'),
  patternDescription: z.string().optional().describe('A description of the pattern if it exists (e.g., floral, striped, plaid)'),
});

const ai = genkit({
  plugins: [googleAI()], 
  // Using gemini-1.5-pro for best visual analysis capabilities.
  // This is the "Pro" class model required for high-quality extraction.
  model: googleAI.model('gemini-1.5-pro'), 
});

// Helper function for Clipdrop API
async function removeBackgroundWithClipdrop(imageBuffer: Buffer): Promise<string> {
  const apiKey = process.env.CLIPDROP_API_KEY; 
  
  if (!apiKey) {
    throw new Error("CLIPDROP_API_KEY is not set in environment variables.");
  }

  // Create a Blob from the buffer (Node 20+)
  // Cast to Uint8Array to avoid TS issues with SharedArrayBuffer
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/jpeg' });
  
  const formData = new FormData();
  formData.append('image_file', blob, 'image.jpg');

  console.log("Sending request to Clipdrop API...");
  const response = await fetch('https://clipdrop-api.co/remove-background/v1', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Clipdrop API failed: ${response.status}`, errorText);
    throw new Error(`Clipdrop API failed: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bufferOutput = Buffer.from(arrayBuffer);
  
  return `data:image/png;base64,${bufferOutput.toString('base64')}`;
}

export const processClothing = ai.defineFlow(
  {
    name: 'processClothing',
    inputSchema: z.any(), 
    outputSchema: z.any(),
  },
  async (inputData) => {
    let imageUri: string = "";
    
    if (typeof inputData === 'string') {
      imageUri = inputData;
    } else if (inputData && typeof inputData === 'object') {
      imageUri = inputData.imgData || inputData.image || inputData.data || "";
    }

    if (!imageUri) {
       console.error("No image data found.");
       return { error: "No image data provided" };
    }

    // Debug input snippet
    console.log(`Input image starts with: ${imageUri.substring(0, 50)}...`);

    let imageForGemini = imageUri;
    let cleanedImageBase64: string | undefined;
    let isBackgroundRemoved = false;

    // Create Input Buffer for Background Removal
    let inputBuffer: Buffer | null = null;
    try {
      if (imageUri.startsWith('http')) {
        const response = await fetch(imageUri);
        const arrayBuffer = await response.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
      } else {
        // Handle Base64
        let base64Data = imageUri.replace(/^data:image\/\w+;base64,/, "");
        base64Data = base64Data.replace(/\s/g, '');
        inputBuffer = Buffer.from(base64Data, 'base64');
        console.log(`Created buffer size: ${inputBuffer.length} bytes`);
      }
    } catch (e) {
      console.error("Failed to create input buffer:", e);
    }

    // Background Removal Logic (Default: Clipdrop)
    if (inputBuffer) {
      try {
        console.log("Attempting background removal with Clipdrop API...");
        cleanedImageBase64 = await removeBackgroundWithClipdrop(inputBuffer);
        console.log("Background removed successfully via Clipdrop. Output length:", cleanedImageBase64.length);
        
        imageForGemini = cleanedImageBase64;
        isBackgroundRemoved = true;
      } catch (clipdropError: any) {
        console.error("Clipdrop failed (or key missing):", clipdropError.message);
        
        // Optional: Fallback to @imgly/background-removal-node if Clipdrop fails?
        // User requested Clipdrop as default. We can try fallback if we want robustness.
        try {
          console.log("Falling back to @imgly/background-removal-node...");
          const { removeBackground } = await import('@imgly/background-removal-node');
          
          const blobOutput = await removeBackground(inputBuffer);
          const arrayBuffer = await blobOutput.arrayBuffer();
          const bufferOutput = Buffer.from(arrayBuffer);
          
          cleanedImageBase64 = `data:image/png;base64,${bufferOutput.toString('base64')}`;
          console.log("Background removed successfully via @imgly.");
          imageForGemini = cleanedImageBase64;
          isBackgroundRemoved = true;
        } catch (imglyError: any) {
           console.error("Fallback @imgly also failed:", imglyError);
        }
      }
    }

    // Ensure imageForGemini is valid if background removal failed
    if (!isBackgroundRemoved) {
       if (!imageUri.startsWith('http') && !imageUri.startsWith('data:')) {
        const isPng = imageUri.trim().startsWith('iVBOR');
        const mime = isPng ? 'image/png' : 'image/jpeg';
        imageForGemini = `data:${mime};base64,${imageUri.trim()}`;
      } else {
        imageForGemini = imageUri;
      }
    }

    // Gemini Analysis Logic
    try {
      console.log("Sending to Gemini...");
      
      const response = await ai.generate({
        prompt: [
          { text: `
            You are the lead fashion stylist for Dressya. 
            Analyze the provided clothing image deeply.
            
            MANDATORY FIELDS TO EXTRACT:
            1. fabric: Identify the texture (e.g., ribbed, smooth, knitted, denim).
            2. materialType: Identify the material (e.g., Cotton, Polyester, Denim, Leather).
            3. hasPattern: Boolean true/false.
            4. patternDescription: Describe the pattern if present (or "Solid" if none).
            5. category: The specific item type (e.g., T-Shirt, Jeans, Dress, Sneakers).
            6. color: Dominant color.
            
            Return ALL fields in the JSON schema. Be verbose with 'fabric' and 'patternDescription'.
          `},
          { media: { url: imageForGemini } },
        ],
        output: { schema: ClothingSchema },
      });

      const result = response.output;
      if (!result) throw new Error("Empty AI response");

      console.log("Gemini success. Result keys:", Object.keys(result));
      
      return {
        ...result,
        cleanedImage: cleanedImageBase64 || null, // Ensure we return the cleaned image if it exists
        isBackgroundRemoved
      };

    } catch (geminiError: any) {
      console.error("Gemini failed:", geminiError);
      return { 
        error: `AI Analysis Failed: ${geminiError.message}`,
        isBackgroundRemoved,
        cleanedImage: cleanedImageBase64 
      };
    }
  }
);

export const OutfitSuggestionSchema = z.object({
  title: z.string().describe('A catchy title for the outfit suggestion.'),
  description: z.string().describe('A brief description of the outfit and why it works.'),
  items: z.array(z.string()).describe('An array of item IDs that make up the outfit.'),
});


export const generateOutfits = ai.defineFlow(
  {
    name: 'generateOutfits',
    inputSchema: z.array(ClothingSchema),
    outputSchema: z.array(OutfitSuggestionSchema),
  },
  async (wardrobe) => {
    if (wardrobe.length < 2) {
      return [{
        title: "Need More Clothes!",
        description: "Add more items to your wardrobe to get outfit suggestions.",
        items: [],
      }];
    }

    const response = await ai.generate({
      prompt: [
        {
          text: `
            You are a world-class fashion stylist. Your task is to create 3-5 stylish outfits from the user's wardrobe.

            **Instructions:**
            1.  **Analyze the Wardrobe:** Carefully review the list of available clothing items, paying attention to category, color, style, and pattern.
            2.  **Search for Inspiration:** Use your knowledge of current fashion trends to generate stylish and coherent outfits.
            3.  **Create Outfits:** Combine the items into complete outfits. Each outfit should have a top, a bottom, and optionally, shoes and accessories if they are available in the wardrobe.
            4.  **Provide a Title and Description:** For each outfit, create a catchy title and a brief description that explains the style and occasion for the outfit.
            5.  **Return the Outfit:** Return a list of outfit suggestions, each with a title, description, and the IDs of the items that make up the outfit.

            **Wardrobe:**
            ${JSON.stringify(wardrobe, null, 2)}
          `,
        },
      ],
      output: { schema: z.array(OutfitSuggestionSchema) },
    });

    return response.output || [];
  }
);

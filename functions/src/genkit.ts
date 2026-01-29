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
  category: z.string().describe('Type of item (e.g., Denim Jacket)'),
  color: z.string().describe('Primary color detected'),
  style: z.string().describe('Fashion style (e.g., Vintage, Streetwear)'),
  confidence: z.number().describe('AI certainty score from 0 to 1'),
  cleanedImage: z.string().optional().describe('Base64 string of the image with background removed'),
  isBackgroundRemoved: z.boolean().describe('Whether the background removal process was successful'),
  fabric: z.string().optional().describe('Fabric texture (e.g., knit, denim, silk)'),
  silhouette: z.string().optional().describe('Item silhouette (e.g., oversized, tailored, A-line)'),
  materialType: z.string().optional().describe('Material of the cloth (e.g., Cotton, Polyester, Wool)'),
  hasPattern: z.boolean().optional().describe('Whether the cloth has patterns or not'),
  patternDescription: z.string().optional().describe('A description of the pattern if it exists'),
});

const ai = genkit({
  plugins: [googleAI()], // The plugin will pick up the env var automatically
  model: googleAI.model('gemini-3-pro-preview'),
});

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

    try {
      console.log("Attempting background removal...");
      const { removeBackground } = await import('@imgly/background-removal-node');

      let inputBuffer: Buffer;
      
      if (imageUri.startsWith('http')) {
        const response = await fetch(imageUri);
        const arrayBuffer = await response.arrayBuffer();
        inputBuffer = Buffer.from(arrayBuffer);
      } else {
        // Handle Base64
        // 1. Remove data URI header if present
        let base64Data = imageUri.replace(/^data:image\/\w+;base64,/, "");
        // 2. Remove whitespace/newlines which can corrupt buffers
        base64Data = base64Data.replace(/\s/g, '');
        
        inputBuffer = Buffer.from(base64Data, 'base64');
        console.log(`Created buffer size: ${inputBuffer.length} bytes`);
      }

      // 3. Configure imgly to be more robust? (defaults are usually fine)
      const blobOutput = await removeBackground(inputBuffer);
      const arrayBuffer = await blobOutput.arrayBuffer();
      const bufferOutput = Buffer.from(arrayBuffer);
      
      cleanedImageBase64 = `data:image/png;base64,${bufferOutput.toString('base64')}`;
      console.log("Background removed successfully.");
      
      imageForGemini = cleanedImageBase64;
      isBackgroundRemoved = true;

    } catch (error) {
      console.error("Background removal failed, using original:", error);
      
      // Fallback: Construct valid Data URI for Gemini
      // If it doesn't have a prefix, assume JPEG (most common for photos) or try to detect
      if (!imageUri.startsWith('http') && !imageUri.startsWith('data:')) {
        // Simple heuristic: if it starts with 'iVBOR', it's PNG. Otherwise assume JPEG.
        const isPng = imageUri.trim().startsWith('iVBOR');
        const mime = isPng ? 'image/png' : 'image/jpeg';
        imageForGemini = `data:${mime};base64,${imageUri.trim()}`;
      } else {
        imageForGemini = imageUri;
      }
    }

    try {
      console.log("Sending to Gemini...");
      const response = await ai.generate({
        prompt: [
          { text: `
            You are the lead fashion stylist for Dressya. 
            Analyze the provided clothing image.
            1. Identify the exact fabric texture (e.g., knit, denim, silk).
            2. Identify the material of the cloth (e.g., Cotton, Polyester, Wool).
            3. Describe the silhouette (e.g., oversized, tailored, A-line).
            4. Does the clothing have a pattern? If so, describe the pattern.
            5. Categorize it for the Dressya calendar (e.g., Professional, Casual, Evening).
            6. Extract standard category, color, and style information.
            7. IMPORTANT: Ensure that the clothing item is fully visible and the background is removed in the final image.
          `},
          { media: { url: imageForGemini } },
        ],
        output: { schema: ClothingSchema },
      });

      const result = response.output;
      if (!result) throw new Error("Empty AI response");

      console.log("Gemini success.");
      return {
        ...result,
        cleanedImage: cleanedImageBase64,
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

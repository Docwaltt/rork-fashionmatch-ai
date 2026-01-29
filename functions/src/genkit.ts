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
  plugins: [googleAI()], 
  model: googleAI.model('gemini-3-pro-preview'), // Kept as requested
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

    // Background Removal Logic
    try {
      console.log("Attempting background removal with @imgly/background-removal-node...");
      const { removeBackground } = await import('@imgly/background-removal-node');

      let inputBuffer: Buffer;
      
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

      // Explicitly configure if needed, but defaults are usually best for now unless we know path issues.
      // We will add logic to ensure success is logged.
      const blobOutput = await removeBackground(inputBuffer);
      const arrayBuffer = await blobOutput.arrayBuffer();
      const bufferOutput = Buffer.from(arrayBuffer);
      
      cleanedImageBase64 = `data:image/png;base64,${bufferOutput.toString('base64')}`;
      console.log("Background removed successfully. Output length:", cleanedImageBase64.length);
      
      imageForGemini = cleanedImageBase64;
      isBackgroundRemoved = true;

    } catch (error: any) {
      console.error("Background removal failed, using original:", error);
      // Log more details
      if (error.message) console.error("Error message:", error.message);
      
      // Fallback
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
      
      // We enforce the schema with strict instructions
      const response = await ai.generate({
        prompt: [
          { text: `
            You are the lead fashion stylist for Dressya. 
            Analyze the provided clothing image deeply.
            
            MANDATORY FIELDS TO EXTRACT:
            1. fabric: Identify the texture (e.g., ribbed, smooth, knitted).
            2. materialType: Identify the material (e.g., Cotton, Polyester, Denim).
            3. hasPattern: Boolean true/false.
            4. patternDescription: Describe the pattern if present (or "Solid" if none).
            5. category: The specific item type.
            6. color: Dominant color.
            
            Return ALL fields in the JSON schema.
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

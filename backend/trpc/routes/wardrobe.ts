import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { MALE_CATEGORIES, FEMALE_CATEGORIES } from "@/types/user";

export const wardrobeRouter = createTRPCRouter({
  analyzeImage: publicProcedure
    .input(z.object({
      image: z.string().describe("Base64 encoded image with data URI prefix"),
      gender: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { image, gender } = input;

      console.log("Analyzing image...", { gender });

      const validCategories = gender === 'male' 
        ? MALE_CATEGORIES 
        : gender === 'female' 
          ? FEMALE_CATEGORIES 
          : [...MALE_CATEGORIES, ...FEMALE_CATEGORIES];

      const categoryLabels = validCategories.map(c => c.label).join(", ");
      const categoryIds = validCategories.map(c => c.id).join(", ");

      // 1. Analyze image using generateObject
      const schema = z.object({
        category: z.string().describe(`The specific category of the clothing item. Best match from: ${categoryIds}`),
        color: z.string().describe("The dominant color of the clothing item"),
        confidence: z.number().describe("Confidence score between 0 and 1"),
      });

      const prompt = `Analyze this clothing item. Identify its specific category and its dominant color.
      
      Valid categories are:
      ${categoryLabels}
      (IDs: ${categoryIds})
      
      ${gender ? `The user is ${gender}, so prefer categories relevant to this gender.` : ''}
      
      Return the best matching category ID from the list above.
      If the item is not clear, provide your best guess.
      `;

      try {
        const result = await generateObject({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image", image: image },
              ],
            },
          ],
          schema: schema,
        });

        console.log("Analysis result:", result);

        // 2. Remove background using edit-images API
        let cleanedImage = image; 
        
        try {
           // Strip data URI prefix for the edit API if present
           const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

           console.log("Sending request to remove background...");
           const editResponse = await fetch("https://toolkit.rork.com/images/edit/", {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               prompt: "Remove the background completely. Keep only the clothing item on a transparent background. High quality, clean edges.",
               images: [{ type: "image", image: base64Data }],
               aspectRatio: "1:1", 
             }),
           });
           
           if (editResponse.ok) {
             const editData = await editResponse.json();
             if (editData.image && editData.image.base64Data) {
               // Add prefix back for the frontend
               cleanedImage = `data:${editData.image.mimeType};base64,${editData.image.base64Data}`;
             }
           } else {
             const errorText = await editResponse.text();
             console.error("Failed to edit image:", errorText);
             // Don't fail the whole request, just return original image
           }
        } catch (e) {
          console.error("Error cleaning image:", e);
        }

        return {
            category: result.category,
            color: result.color,
            cleanedImage: cleanedImage,
        };

      } catch (error) {
        console.error("Error analyzing image:", error);
        // If analysis fails, we still want to return something if possible, 
        // but since the user expects auto-categorization, throwing might be better
        // to trigger the retry/manual flow in frontend.
        throw new Error("Failed to analyze image. Please try again.");
      }
    }),
});

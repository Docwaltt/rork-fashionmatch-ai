import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { generateObject } from "@rork-ai/toolkit-sdk";

export const wardrobeRouter = createTRPCRouter({
  analyzeImage: publicProcedure
    .input(z.object({
      image: z.string().describe("Base64 encoded image with data URI prefix"),
      gender: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { image, gender } = input;

      console.log("Analyzing image...", { gender });

      // 1. Analyze image using generateObject
      const schema = z.object({
        category: z.string().describe("The specific category of the clothing item (e.g., shirt, dress, jeans)"),
        color: z.string().describe("The dominant color of the clothing item"),
      });

      const prompt = `Analyze this clothing item. Identify its specific category and its dominant color.
      
      Valid categories are:
      For Male: shirt, t-shirt, polo, trousers, jeans, shorts, suit, blazer, jacket, sweater, hoodie, shoes, sneakers, boots, accessories, watch, belt, tie.
      For Female: blouse, top, t-shirt, dress, gown, skirt, trousers, jeans, shorts, jumpsuit, jacket, cardigan, sweater, coat, heels, flats, sneakers, boots, sandals, bag, jewelry, accessories.
      
      ${gender ? `The user is ${gender}, so prefer categories relevant to this gender.` : ''}
      
      Return the best matching category from the list above if possible.
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
           // Strip data URI prefix for the edit API if present, as it likely expects raw base64 or handles it.
           // However, let's try to send what we have or clean it.
           // The toolkit usually expects standard base64 strings.
           // Let's try to strip the header for the API call to be safe if it's a raw base64 requirement.
           const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

           const editResponse = await fetch("https://toolkit.rork.com/images/edit/", {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
             },
             body: JSON.stringify({
               prompt: "Remove the background completely. Keep only the clothing item on a transparent background. High quality, clean edges.",
               images: [{ type: "image", image: base64Data }],
               // Use 1:1 aspect ratio as most clothing items are centered
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
             console.error("Failed to edit image:", await editResponse.text());
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
        throw new Error("Failed to analyze image");
      }
    }),
});

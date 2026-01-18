import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { MALE_CATEGORIES, FEMALE_CATEGORIES } from "@/types/user";

export const wardrobeRouter = createTRPCRouter({
  analyzeImage: publicProcedure
    .input(z.object({
      image: z.string().describe("Base64 encoded image with data URI prefix"),
      gender: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { image, gender } = input;

      console.log("[Wardrobe] Starting image analysis...");
      console.log("[Wardrobe] Gender:", gender);
      console.log("[Wardrobe] Image length:", image?.length);

      const validCategories = gender === 'male' 
        ? MALE_CATEGORIES 
        : gender === 'female' 
          ? FEMALE_CATEGORIES 
          : [...MALE_CATEGORIES, ...FEMALE_CATEGORIES];

      const categoryIds = validCategories.map(c => c.id);

      // Get Firebase project ID from environment
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      if (!projectId) {
        console.error("Firebase project ID not configured");
        throw new Error("Server configuration error. Please try again later.");
      }

      // Firebase Cloud Function URL (using default region us-central1)
      // Adjust region if your function is deployed elsewhere
      const functionUrl = `https://us-central1-${projectId}.cloudfunctions.net/processClothingFn`;
      
      console.log("[Wardrobe] Calling Firebase function:", functionUrl);

      try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        console.log("[Wardrobe] Base64 data length (stripped):", base64Data?.length);

        const requestBody = {
          image: base64Data,
          gender: gender,
          validCategories: categoryIds,
        };
        console.log("[Wardrobe] Request body keys:", Object.keys(requestBody));

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log("[Wardrobe] Firebase response status:", response.status);
        console.log("[Wardrobe] Firebase response ok:", response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Wardrobe] Firebase function error response:", errorText);
          console.error("[Wardrobe] Status:", response.status);
          throw new Error(`Firebase function failed (${response.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        console.log("[Wardrobe] Firebase response data keys:", Object.keys(data));
        console.log("[Wardrobe] Category:", data.category);
        console.log("[Wardrobe] Color:", data.color || data.dominantColor);
        console.log("[Wardrobe] Has cleanedImage:", !!data.cleanedImage);
        console.log("[Wardrobe] Has cleanedImageUrl:", !!data.cleanedImageUrl);

        // Handle different response formats from Firebase function
        let cleanedImage: string | null = null;
        
        if (data.cleanedImage) {
          // If cleanedImage is already a full data URI or URL
          cleanedImage = data.cleanedImage.startsWith('data:') || data.cleanedImage.startsWith('http')
            ? data.cleanedImage
            : `data:image/png;base64,${data.cleanedImage}`;
        } else if (data.cleanedImageUrl) {
          // If the function returns a URL
          cleanedImage = data.cleanedImageUrl;
        }

        if (!cleanedImage) {
          console.error("No cleaned image returned from Firebase function");
          throw new Error("Image processing failed. No cleaned image returned.");
        }

        // Validate category against valid options
        let category = data.category?.toLowerCase()?.trim() || '';
        if (category && !categoryIds.includes(category)) {
          // Try to find a close match
          const matchedCat = categoryIds.find(id => 
            category.includes(id) || id.includes(category)
          );
          if (matchedCat) {
            category = matchedCat;
          }
          console.log("Category mapped:", data.category, "->", category);
        }

        return {
          category: category || data.category,
          color: data.color || data.dominantColor || 'unknown',
          cleanedImage: cleanedImage,
        };

      } catch (error: any) {
        console.error("[Wardrobe] Error calling Firebase function:", error);
        console.error("[Wardrobe] Error name:", error?.name);
        console.error("[Wardrobe] Error message:", error?.message);
        
        if (error?.message?.includes("fetch")) {
          throw new Error("Unable to connect to image processing service. Please check your internet connection.");
        }
        
        throw new Error(error.message || "Failed to analyze image. Please try again.");
      }
    }),
});

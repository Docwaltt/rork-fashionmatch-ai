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

      console.log("Analyzing image via Firebase Cloud Function...", { gender });

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
      
      console.log("Calling Firebase function:", functionUrl);

      try {
        // Strip data URI prefix if present for sending to Firebase
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Data,
            gender: gender,
            validCategories: categoryIds,
          }),
        });

        console.log("Firebase function response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Firebase function error:", errorText);
          throw new Error(`Firebase function failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("Firebase function response data:", data);

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
        console.error("Error calling Firebase function:", error);
        throw new Error(error.message || "Failed to analyze image. Please check your connection and try again.");
      }
    }),
});

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

      // Firebase Cloud Run URL for processClothingFn (onRequest HTTP function)
      const functionUrl = "https://processclothingfn-pfc64ufnsq-uc.a.run.app";
      
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

        console.log("[Wardrobe] Sending request to Firebase...");
        console.log("[Wardrobe] Request payload size:", JSON.stringify(requestBody).length, "bytes");
        
        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        console.log("[Wardrobe] Firebase response status:", response.status);
        console.log("[Wardrobe] Firebase response ok:", response.ok);

        console.log("[Wardrobe] Response headers:", Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Wardrobe] ===== FIREBASE ERROR =====");
          console.error("[Wardrobe] Status:", response.status);
          console.error("[Wardrobe] Status Text:", response.statusText);
          console.error("[Wardrobe] URL called:", functionUrl);
          console.error("[Wardrobe] Raw error response:", errorText);
          
          // Try to parse JSON error if possible
          let errorMessage = `Firebase function failed (${response.status})`;
          let errorDetails = '';
          try {
            const errorJson = JSON.parse(errorText);
            console.error("[Wardrobe] Parsed error JSON:", JSON.stringify(errorJson, null, 2));
            errorDetails = errorJson.error?.message || errorJson.message || errorJson.error || errorJson.details || '';
            if (typeof errorDetails === 'object') {
              errorDetails = JSON.stringify(errorDetails);
            }
            errorMessage = errorDetails || errorMessage;
          } catch {
            errorDetails = errorText.substring(0, 300);
            console.error("[Wardrobe] Could not parse error as JSON, raw text:", errorDetails);
          }
          console.error("[Wardrobe] ===== END FIREBASE ERROR =====");
          
          // Provide user-friendly messages based on status
          if (response.status === 400) {
            throw new Error(`Bad request: ${errorMessage}`);
          } else if (response.status === 401 || response.status === 403) {
            throw new Error("Authentication error with Firebase function.");
          } else if (response.status === 404) {
            throw new Error("Firebase function 'processClothingFn' not found.");
          } else if (response.status === 413) {
            throw new Error("Image too large. Please use a smaller image.");
          } else if (response.status === 500) {
            throw new Error(`Server error: ${errorMessage}`);
          } else if (response.status === 502 || response.status === 503) {
            throw new Error("Firebase function temporarily unavailable. Try again.");
          }
          
          throw new Error(errorMessage);
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
           // If we have a category but no image, we might want to still return the category
           // But user insisted on image editing.
           // Let's check if we can return original image as fallback if allowed,
           // but for now throw specific error.
          throw new Error("Background removal failed. Please try another image.");
        }

        // Validate category against valid options
        let category = data.category?.toLowerCase()?.trim() || '';
        
        // Handle common variations
        if (category === 't-shirt' || category === 'shirt') category = 'top';
        if (category === 'pants' || category === 'trousers' || category === 'jeans') category = 'bottom';
        if (category === 'sneakers' || category === 'boots') category = 'shoes';
        if (category === 'jacket' || category === 'coat') category = 'outerwear';
        if (category === 'bag' || category === 'hat') category = 'accessories';

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
        console.error("[Wardrobe] ===== CATCH BLOCK ERROR =====");
        console.error("[Wardrobe] Error type:", typeof error);
        console.error("[Wardrobe] Error name:", error?.name);
        console.error("[Wardrobe] Error message:", error?.message);
        console.error("[Wardrobe] Error stack:", error?.stack);
        console.error("[Wardrobe] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
        console.error("[Wardrobe] ===== END CATCH BLOCK =====");
        
        // Re-throw if it's already a processed error from above
        if (error?.message && !error?.message?.includes("fetch failed")) {
          throw error;
        }
        
        if (error?.message?.includes("fetch") || error?.name === "TypeError") {
          throw new Error("Network error: Unable to reach image processing service.");
        }
        
        throw new Error(error?.message || "Failed to analyze image. Please try again.");
      }
    }),
});

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
        console.log("[Wardrobe] ===== FIREBASE SUCCESS RESPONSE =====");
        console.log("[Wardrobe] Full response data:", JSON.stringify(data, null, 2).substring(0, 1000));
        console.log("[Wardrobe] Response data keys:", Object.keys(data));
        console.log("[Wardrobe] Category:", data.category);
        console.log("[Wardrobe] Color:", data.color || data.dominantColor);
        console.log("[Wardrobe] cleanedImage present:", !!data.cleanedImage, "- length:", data.cleanedImage?.length || 0);
        console.log("[Wardrobe] cleanedImageUrl present:", !!data.cleanedImageUrl);
        console.log("[Wardrobe] processedImage present:", !!data.processedImage);
        console.log("[Wardrobe] image present:", !!data.image);
        console.log("[Wardrobe] ===== END FIREBASE SUCCESS RESPONSE =====");

        // Handle different response formats from Firebase function
        // Check multiple possible field names the backend might use
        let cleanedImage: string | null = null;
        const possibleImageFields = ['cleanedImage', 'cleanedImageUrl', 'processedImage', 'image', 'resultImage', 'outputImage'];
        
        for (const field of possibleImageFields) {
          if (data[field] && typeof data[field] === 'string' && data[field].length > 100) {
            const imgData = data[field];
            cleanedImage = imgData.startsWith('data:') || imgData.startsWith('http')
              ? imgData
              : `data:image/png;base64,${imgData}`;
            console.log(`[Wardrobe] Found cleaned image in field: ${field}`);
            break;
          }
        }

        if (!cleanedImage) {
          console.error("[Wardrobe] No cleaned image found in any expected field");
          console.error("[Wardrobe] Available fields:", Object.keys(data));
          console.error("[Wardrobe] Field values (truncated):", Object.entries(data).map(([k, v]) => 
            `${k}: ${typeof v === 'string' ? v.substring(0, 50) + '...' : typeof v}`
          ));
          // Return null for cleanedImage - frontend will handle fallback
          return {
            category: data.category?.toLowerCase()?.trim() || 'unknown',
            color: data.color || data.dominantColor || 'unknown',
            cleanedImage: null,
            backgroundRemovalFailed: true,
          };
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

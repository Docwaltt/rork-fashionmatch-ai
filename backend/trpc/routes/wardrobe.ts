import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { MALE_CATEGORIES, FEMALE_CATEGORIES } from "@/types/user";
import { GoogleAuth } from "google-auth-library";

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

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      console.log("[Wardrobe] Base64 data length (stripped):", base64Data?.length);

      const requestBody = {
        image: base64Data,
        gender: gender,
        validCategories: categoryIds,
        removeBackground: true,
        includeCleanedImage: true,
        includeSegmentation: true,
      };
      console.log("[Wardrobe] Request body keys:", Object.keys(requestBody));
      console.log("[Wardrobe] Request payload size:", JSON.stringify(requestBody).length, "bytes");

      // Retry logic for transient failures
      const MAX_RETRIES = 2;
      let lastError: Error | null = null;

      // Initialize Google Auth inside the request to ensure env vars are loaded
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.EXPO_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = (process.env.GOOGLE_PRIVATE_KEY || process.env.EXPO_PUBLIC_GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
      const projectId = process.env.GOOGLE_PROJECT_ID || process.env.EXPO_PUBLIC_GOOGLE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

      if (!clientEmail || !privateKey || !projectId) {
        const missing = [];
        if (!clientEmail) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
        if (!privateKey) missing.push("GOOGLE_PRIVATE_KEY");
        if (!projectId) missing.push("GOOGLE_PROJECT_ID");

        console.error("[Wardrobe] Missing Google Cloud credentials:", missing.join(", "));
        throw new Error(`Server configuration error: Missing cloud credentials (${missing.join(", ")})`);
      }

      const auth = new GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
          project_id: projectId,
        },
      });

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[Wardrobe] Attempt ${attempt}/${MAX_RETRIES} - Sending request to Firebase...`);
          
          // Get ID token for authentication
          console.log("[Wardrobe] Getting ID token...");
          const client = await auth.getIdTokenClient(functionUrl);
          const authHeaders = await client.getRequestHeaders();

          // Handle different Header formats (Standard Headers object vs Plain Object)
          let idToken = '';
          if (typeof authHeaders.get === 'function') {
            idToken = authHeaders.get('Authorization') || authHeaders.get('authorization') || '';
          } else {
            const h = authHeaders as Record<string, string>;
            idToken = h['Authorization'] || h['authorization'] || '';
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout
          
          const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": idToken,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

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

        let data = await response.json();
        console.log("[Wardrobe] ===== FIREBASE SUCCESS RESPONSE =====");

        // Handle Genkit/Firebase function nesting
        if (data.result && typeof data.result === 'object') {
          console.log("[Wardrobe] Unwrapping data.result");
          data = data.result;
        } else if (data.data && typeof data.data === 'object') {
          console.log("[Wardrobe] Unwrapping data.data");
          data = data.data;
        }

        console.log("[Wardrobe] Response data keys:", Object.keys(data));
        console.log("[Wardrobe] Full response data (truncated):", JSON.stringify(data).substring(0, 500));

        const rawCategory = data.category || data.type || data.label || '';
        const rawColor = data.color || data.colour || data.dominantColor || data.dominant_color || '';
        const rawTexture = data.texture || data.material || data.fabric || 'plain';
        const rawDesign = data.designPattern || data.pattern || data.design || data.style || 'none';

        console.log("[Wardrobe] Extracted raw fields:", { rawCategory, rawColor, rawTexture, rawDesign });
        console.log("[Wardrobe] cleanedImageUrl present:", !!data.cleanedImageUrl);
        console.log("[Wardrobe] processedImage present:", !!data.processedImage);
        console.log("[Wardrobe] image present:", !!data.image);
        console.log("[Wardrobe] ===== END FIREBASE SUCCESS RESPONSE =====");

        // Handle different response formats from Firebase function
        // Check multiple possible field names the backend might use
        let cleanedImage: string | null = null;
        const possibleImageFields = [
          'cleanedImage', 'processedImage', 'backgroundRemovedImage',
          'segmentationImage', 'cleanedImageUrl', 'image', 'resultImage',
          'outputImage', 'no_bg_image', 'nobg'
        ];
        
        for (const field of possibleImageFields) {
          if (data[field] && typeof data[field] === 'string' && data[field].length > 50) {
            const imgData = data[field];
            cleanedImage = (imgData.startsWith('data:') || imgData.startsWith('http'))
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
        let category = rawCategory.toLowerCase().trim();
        
        // Handle common variations and synonyms to map to our granular categories
        const categoryMap: Record<string, string> = {
          // Males
          'tshirt': 't-shirt',
          'tee': 't-shirt',
          't shirt': 't-shirt',
          'formal shirt': 'shirt',
          'dress shirt': 'shirt',
          'pants': 'trousers',
          'pant': 'trousers',
          'slacks': 'trousers',
          'chinos': 'trousers',
          'sneaker': 'sneakers',
          'boot': 'boots',
          'formal shoes': 'shoes',
          'dress shoes': 'shoes',
          'oxfords': 'shoes',
          'loafers': 'shoes',
          'necktie': 'tie',
          // Females
          'blouses': 'blouse',
          'tops': 'top',
          'dresses': 'dress',
          'gowns': 'gown',
          'skirts': 'skirt',
          'jumpsuits': 'jumpsuit',
          'cardigans': 'cardigan',
          'sweaters': 'sweater',
          'coats': 'coat',
          'jackets': 'jacket',
          'heel': 'heels',
          'flat': 'flats',
          'sandal': 'sandals',
          'bags': 'bag',
          'purse': 'bag',
          'handbag': 'bag',
          'jewelry': 'jewelry',
          'necklace': 'jewelry',
          'earrings': 'jewelry',
          'bracelet': 'jewelry',
          'ring': 'jewelry',
          'necklaces': 'jewelry'
        };

        if (categoryMap[category]) {
          console.log(`[Wardrobe] Mapping category: ${category} -> ${categoryMap[category]}`);
          category = categoryMap[category];
        }

        if (category && !categoryIds.includes(category)) {
          // Try to find a close match if not found in map
          const matchedCat = categoryIds.find(id => 
            category.includes(id) || id.includes(category)
          );
          if (matchedCat) {
            category = matchedCat;
          }
          console.log("[Wardrobe] Category final match check:", category, "is valid:", categoryIds.includes(category));
        }

          return {
            category: category || rawCategory || 'unknown',
            color: rawColor || 'unknown',
            texture: rawTexture,
            designPattern: rawDesign,
            cleanedImage: cleanedImage,
          };

        } catch (error: any) {
          console.error(`[Wardrobe] Attempt ${attempt} failed:`, error?.message);
          lastError = error;
          
          // Don't retry for non-transient errors
          const isTransient = 
            error?.name === 'AbortError' ||
            error?.message?.includes('fetch') ||
            error?.message?.includes('network') ||
            error?.message?.includes('ECONNREFUSED') ||
            error?.message?.includes('ETIMEDOUT') ||
            error?.name === 'TypeError';
          
          if (!isTransient || attempt === MAX_RETRIES) {
            break;
          }
          
          // Wait before retry (exponential backoff)
          console.log(`[Wardrobe] Waiting ${attempt * 2}s before retry...`);
          await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }

      // All retries failed
      console.error("[Wardrobe] ===== ALL RETRIES FAILED =====");
      console.error("[Wardrobe] Final error:", lastError?.message);
      console.error("[Wardrobe] Error name:", lastError?.name);
      
      if (lastError?.name === 'AbortError') {
        throw new Error("Request timed out. The image processing service is not responding.");
      }
      
      if (lastError?.message?.includes("fetch") || lastError?.name === "TypeError") {
        throw new Error("Cannot connect to image processing service. Please verify the Firebase function is deployed and accessible.");
      }
      
      throw new Error(lastError?.message || "Failed to analyze image. Please try again.");
    }),
});

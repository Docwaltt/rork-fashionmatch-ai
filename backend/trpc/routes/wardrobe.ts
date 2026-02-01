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
      console.log("[Wardrobe] Base64 start:", base64Data?.substring(0, 50));

      const requestBody = {
        image: base64Data,
        gender: gender,
        validCategories: categoryIds,
        // Multiple naming conventions for background removal
        removeBackground: true,
        remove_background: true,
        background_removal: true,
        background: "remove",
        includeCleanedImage: true,
        includeSegmentation: true,
        cleaned: true,
      };
      console.log("[Wardrobe] Request body keys:", Object.keys(requestBody));

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

          // Handle different Header formats
          let idToken = '';
          if (typeof authHeaders.get === 'function') {
            idToken = (authHeaders as any).get('Authorization') || (authHeaders as any).get('authorization') || '';
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

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Wardrobe] Firebase error response:", errorText);
          throw new Error(`Firebase function failed (${response.status}): ${errorText}`);
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

        const rawCategory = data.category || data.type || data.label || '';
        const rawColor = data.color || data.colour || data.dominantColor || data.dominant_color || '';
        const rawTexture = data.texture || data.material || data.fabric || 'plain';
        const rawDesign = data.designPattern || data.pattern || data.design || data.style || 'none';

        console.log("[Wardrobe] Extracted raw fields:", { rawCategory, rawColor, rawTexture, rawDesign });

        // Handle different response formats for image
        let cleanedImage: string | null = null;
        const possibleImageFields = [
          'cleanedImage', 'processedImage', 'backgroundRemovedImage',
          'segmentationImage', 'cleanedImageUrl', 'image', 'resultImage',
          'outputImage', 'no_bg_image', 'nobg', 'cleaned_image', 'background_removed'
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

        // Validate category against valid options
        let category = rawCategory.toLowerCase().trim();
        
        // Handle common variations and synonyms
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
          // Try to find a close match
          const matchedCat = categoryIds.find(id => 
            category.includes(id) || id.includes(category)
          );
          if (matchedCat) {
            category = matchedCat;
          }
          console.log("[Wardrobe] Category match check:", category, "is valid:", categoryIds.includes(category));
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
          const isTransient = error?.name === 'AbortError' || error?.message?.includes('fetch') || error?.name === 'TypeError';
          if (!isTransient || attempt === MAX_RETRIES) break;
          await new Promise(r => setTimeout(r, attempt * 2000));
        }
      }

      throw new Error(lastError?.message || "Failed to analyze image. Please try again.");
    }),

  suggestOutfit: publicProcedure
    .input(z.object({
      items: z.array(z.any()),
      event: z.string().optional(),
      gender: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { items, event, gender } = input;
      console.log(`[Wardrobe] Generating outfit for event: ${event}, items: ${items.length}`);

      if (items.length === 0) {
        throw new Error("Your wardrobe is empty. Add some clothes first!");
      }

      // Simple heuristic based grouping
      const tops = items.filter((item) => item.category === "top" || item.category === "shirt" || item.category === "t-shirt" || item.category === "polo");
      const bottoms = items.filter((item) => item.category === "bottom" || item.category === "trousers" || item.category === "jeans" || item.category === "shorts");
      const dresses = items.filter((item) => item.category === "dress" || item.category === "gown" || item.category === "jumpsuit");
      const outerwear = items.filter((item) => item.category === "outerwear" || item.category === "jacket" || item.category === "coat" || item.category === "blazer");
      const shoes = items.filter((item) => item.category === "shoes" || item.category === "sneakers" || item.category === "boots" || item.category === "heels" || item.category === "flats");
      const accessories = items.filter((item) => item.category === "accessories" || item.category === "bag" || item.category === "jewelry" || item.category === "watch");

      const suggestion: any[] = [];
      const isFormal = event === 'formal' || event === 'business';
      const isWorkout = event === 'workout';

      // Selection logic
      if (dresses.length > 0 && !isWorkout && (gender === 'female' || Math.random() > 0.8)) {
        suggestion.push(dresses[Math.floor(Math.random() * dresses.length)]);
      } else {
        if (tops.length > 0) suggestion.push(tops[Math.floor(Math.random() * tops.length)]);
        if (bottoms.length > 0) suggestion.push(bottoms[Math.floor(Math.random() * bottoms.length)]);
      }

      if (outerwear.length > 0 && (isFormal || Math.random() > 0.5)) {
        suggestion.push(outerwear[Math.floor(Math.random() * outerwear.length)]);
      }

      if (shoes.length > 0) {
        suggestion.push(shoes[Math.floor(Math.random() * shoes.length)]);
      }

      if (accessories.length > 0 && Math.random() > 0.3) {
        suggestion.push(accessories[Math.floor(Math.random() * accessories.length)]);
      }

      if (suggestion.length === 0) {
        suggestion.push(items[Math.floor(Math.random() * items.length)]);
      }

      return {
        suggestion,
        reasoning: `Curated for a ${event} look based on your unique style profile.`,
      };
    }),
});

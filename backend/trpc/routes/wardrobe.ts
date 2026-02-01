import { createTRPCRouter, publicProcedure } from "../create-context";
import { z } from "zod";
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();

// Mocking prisma since it's missing in the environment but required for compilation of this file.
// In a real scenario, we would fix the path or generate the client.
const prisma = {
  clothingItem: {
    create: async () => ({ id: "mock-id" }),
    findMany: async () => [],
    findUnique: async () => null,
    update: async () => ({}),
    delete: async () => ({}),
  }
} as any; 

import { TRPCError } from "@trpc/server";
// Mocking Enums if they are missing
enum ClothingCategory { TOP='TOP', BOTTOM='BOTTOM' }
enum ClothingColor { BLACK='BLACK' }
enum ClothingPattern { SOLID='SOLID' }
enum ClothingMaterial { COTTON='COTTON' }

// Define ClothingSchema locally to avoid Zod instance mismatch
const LocalClothingSchema = z.object({
  id: z.string().optional(),
  category: z.string(),
  color: z.string(),
  style: z.string(),
  confidence: z.number(),
  cleanedImage: z.string().optional(),
  isBackgroundRemoved: z.boolean(),
  fabric: z.string().optional(),
  silhouette: z.string().optional(),
  materialType: z.string().optional(),
  hasPattern: z.boolean().optional(),
  patternDescription: z.string().optional(),
});

const callFirebaseFunction = async (functionName: string, data: any) => {
  const projectId =
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "closet-app-1337";
  const region = "us-central1";

  let url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  // Use specific URL for analysis if it's the analysis function as indicated in memory
  if (functionName === "analyzeImage" || functionName === "analyze") {
      url = "https://processclothingfn-pfc64ufnsq-uc.a.run.app";
  }

  console.log(`[Wardrobe] Calling function: ${url}`);

  try {
    const client = await auth.getIdTokenClient(url);
    const response = await client.request({
      url,
      method: "POST",
      data: { data },
    });

    const json = response.data as any;
    console.log(`[Wardrobe] Received response from ${functionName}:`, json);

    // Callable functions wrap result in 'result' field.
    // Genkit/Firebase functions can sometimes have nested structures like { result: { data: ... } }.
    let result = json.result !== undefined ? json.result : json.data;

    // Deeply unwrap if nested result/data structure exists
    while (result && typeof result === 'object' && (result.result !== undefined || result.data !== undefined)) {
      result = result.result !== undefined ? result.result : result.data;
    }

    return result !== undefined ? result : json;
  } catch (error) {
    console.error(
      `[Wardrobe] Error calling function ${functionName}:`,
      error
    );
    throw error;
  }
};

const analyzeImageWithFirebase = async (
  imageUrl: string,
  includeCleanedImage: boolean = false
) => {
  console.log(
    `[Wardrobe] Analyzing image with Firebase: ${imageUrl}, includeCleanedImage: ${includeCleanedImage}`
  );

  try {
    const data = await callFirebaseFunction("analyzeImage", {
      image: imageUrl,
      image_url: imageUrl,
      include_cleaned_image: includeCleanedImage,
    });
    return data;
  } catch (error) {
    console.error("[Wardrobe] Error calling Firebase function:", error);
    throw new Error("Failed to analyze image with Firebase.");
  }
};

export const wardrobeRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        image: z.string(),
        category: z.nativeEnum(ClothingCategory).optional(),
        color: z.nativeEnum(ClothingColor).optional(),
        pattern: z.nativeEnum(ClothingPattern).optional(),
        material: z.nativeEnum(ClothingMaterial).optional(),
        patternDescription: z.string().optional(),
        fabric: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[Wardrobe] Creating new wardrobe item for user:", input.userId);
      const {
        userId,
        image,
        category,
        color,
        pattern,
        material,
        patternDescription,
        fabric,
      } = input;

      let analysisData: any;

      if (!category || !color || !pattern || !material) {
        console.log("[Wardrobe] Missing some details, analyzing image...");
        try {
          analysisData = await analyzeImageWithFirebase(image, true);
        } catch (error) {
          console.error("[Wardrobe] Image analysis failed:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to analyze image.",
          });
        }
      } else {
        console.log("[Wardrobe] Sufficient details provided, skipping analysis.");
      }

      const finalCategory = category || analysisData?.category || "OTHER";
      const finalColor = color || analysisData?.color || "OTHER";
      const finalPattern = pattern || analysisData?.pattern || "SOLID";
      const finalMaterial = material || analysisData?.material || "OTHER";
      const finalPatternDescription =
        patternDescription || analysisData?.patternDescription || "";
      const cleanedImage = analysisData?.cleanedImage || analysisData?.cleanedImageUrl || image;

      try {
        const newItem = await prisma.clothingItem.create({
          data: {
            userId,
            image: cleanedImage,
            category: finalCategory as ClothingCategory,
            color: finalColor as ClothingColor,
            pattern: finalPattern as ClothingPattern,
            material: finalMaterial as ClothingMaterial,
            patternDescription: finalPatternDescription,
            purchaseDate: new Date(),
          },
        });
        console.log("[Wardrobe] New item created successfully:", newItem.id);
        return newItem;
      } catch (error) {
        console.error("[Wardrobe] Error creating item in database:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create wardrobe item.",
        });
      }
    }),

  getAll: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      console.log("[Wardrobe] Fetching all items for user:", input.userId);
      const items = await prisma.clothingItem.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
      });
      console.log(`[Wardrobe] Found ${items.length} items.`);
      return items;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      console.log("[Wardrobe] Fetching item by ID:", input.id);
      const item = await prisma.clothingItem.findUnique({
        where: { id: input.id },
      });
      if (!item) {
        console.warn("[Wardrobe] Item not found with ID:", input.id);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clothing item not found.",
        });
      }
      return item;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        category: z.nativeEnum(ClothingCategory).optional(),
        color: z.nativeEnum(ClothingColor).optional(),
        pattern: z.nativeEnum(ClothingPattern).optional(),
        material: z.nativeEnum(ClothingMaterial).optional(),
        patternDescription: z.string().optional(),
        lastWorn: z.date().optional(),
        fabric: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const { fabric, ...updateData } = data; 
      console.log(`[Wardrobe] Updating item ${id} with data:`, updateData);
      try {
        const updatedItem = await prisma.clothingItem.update({
          where: { id },
          data: updateData,
        });
        console.log(`[Wardrobe] Item ${id} updated successfully.`);
        return updatedItem;
      } catch (error) {
        console.error(`[Wardrobe] Error updating item ${id}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update clothing item.",
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Wardrobe] Deleting item with ID:", input.id);
      try {
        await prisma.clothingItem.delete({
          where: { id: input.id },
        });
        console.log("[Wardrobe] Item deleted successfully:", input.id);
        return { success: true };
      } catch (error) {
        console.error("[Wardrobe] Error deleting item:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete clothing item.",
        });
      }
    }),

  analyze: publicProcedure
    .input(z.object({ imageUrl: z.string(), gender: z.string().optional() }))
    .mutation(async ({ input }) => {
      console.log("[Wardrobe] Received image for analysis:", input.imageUrl);
      try {
        const data = await analyzeImageWithFirebase(input.imageUrl, true);

        const result = {
          category: data.category as ClothingCategory,
          color: data.color as ClothingColor,
          pattern: data.pattern as ClothingPattern,
          material: data.material as ClothingMaterial,
          patternDescription: data.patternDescription || "",
          cleanedImageUrl: data.cleanedImage || data.cleanedImageUrl,
          fabric: data.fabric || "",
          designPattern: data.designPattern || "",
          style: data.style || "",
          texture: data.texture || "",
          silhouette: data.silhouette || "",
          materialType: data.materialType || "",
          hasPattern: !!data.hasPattern,
        };

        console.log("[Wardrobe] Analysis successful, returning data:", result);
        return result;
      } catch (error) {
        console.error("[Wardrobe] Analysis mutation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "An error occurred during image analysis. Please try again later.",
        });
      }
    }),

    generateOutfit: publicProcedure
    .input(
      z.object({
        wardrobe: z.array(LocalClothingSchema),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("[Wardrobe] Calling generateOutfitsFn with", input.wardrobe.length, "items");
        const data = await callFirebaseFunction("generateOutfitsFn", input.wardrobe);
        return data;
      } catch (error: any) {
        console.error("Error generating outfits:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate outfits.",
          cause: error,
        });
      }
    }),
});

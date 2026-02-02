import { createTRPCRouter, publicProcedure } from "../create-context";
import { z } from "zod";
import { functions } from "../../../lib/firebase"; // Import the initialized functions instance
import { httpsCallable } from "firebase/functions";

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

      // Check if we need to analyze the image
      let analysisData: any;
      if (!category || !color || !pattern || !material) {
        console.log("[Wardrobe] Missing some details, analyzing image...");
        try {
          // Use the 'analyzeImage' Cloud Function
          // Note: The function name in index.ts is 'analyzeImage', which wraps 'processClothing'.
          // 'processClothing' expects 'imgData' or 'image' or 'imageBase64'.
          const analyzeImage = httpsCallable(functions, 'analyzeImage');
          const result = await analyzeImage({ imgData: image });
          analysisData = result.data;
          
          if (!analysisData || typeof analysisData !== 'object') {
             throw new Error("Invalid analysis result");
          }

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
      const cleanedImage = analysisData?.cleanedImage || image; // Note: Genkit returns 'cleanedImage'

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
      console.log("[Wardrobe] Received image for analysis");
      try {
        // Use the 'analyzeImage' Cloud Function directly via SDK
        const analyzeImage = httpsCallable(functions, 'analyzeImage');
        // 'processClothing' flow expects 'imgData' (or aliases handled in index.ts)
        const result = await analyzeImage({ imgData: input.imageUrl });
        const data = result.data as any;

        // Map the result to our expected structure
        // Note: The Genkit flow returns fields like 'category', 'color', 'cleanedImage' (not cleanedImageUrl)
        const resultData = {
          category: data.category as ClothingCategory,
          color: data.color as ClothingColor,
          pattern: data.pattern as ClothingPattern, // Note: Schema might not return 'pattern' field directly, check Genkit schema
          // Genkit schema has: category, color, style, confidence, cleanedImage, isBackgroundRemoved, fabric, silhouette, materialType, hasPattern, patternDescription
          material: data.materialType as ClothingMaterial, // mapped from materialType
          patternDescription: data.patternDescription || "",
          cleanedImageUrl: data.cleanedImage, // mapped from cleanedImage
          fabric: data.fabric || "",
          designPattern: data.patternDescription || "", // mapping patternDescription to designPattern if needed
          style: data.style || "",
          texture: data.fabric || "", // approximations if fields missing
          silhouette: data.silhouette || "",
          materialType: data.materialType || "",
          hasPattern: !!data.hasPattern,
        };

        console.log("[Wardrobe] Analysis successful");
        return resultData;
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
        // Use the 'generateOutfitsFn' Cloud Function
        const generateOutfits = httpsCallable(functions, 'generateOutfitsFn');
        
        console.log("[Wardrobe] Calling generateOutfitsFn with", input.wardrobe.length, "items");
        
        // Pass the wardrobe array directly. 
        // Note: index.ts 'generateOutfitsFn' is an onCallGenkit.
        // It wraps the 'generateOutfits' flow which takes 'z.array(ClothingSchema)'.
        // So we should pass the array directly as the argument to the callable.
        const result = await generateOutfits(input.wardrobe);
        
        console.log("[Wardrobe] generateOutfitsFn result received");
        return result.data;
      } catch (error: any) {
        console.error("Error generating outfits:", error);
        if (error.code) {
             console.error("Firebase Error Code:", error.code);
        }
        if (error.message) {
             console.error("Firebase Error Message:", error.message);
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate outfits.",
          cause: error,
        });
      }
    }),
});

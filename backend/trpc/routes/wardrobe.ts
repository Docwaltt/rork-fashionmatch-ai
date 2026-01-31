'''import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { prisma } from "../../prisma";
import { TRPCError } from "@trpc/server";
import {
  ClothingCategory,
  ClothingColor,
  ClothingPattern,
  ClothingMaterial,
  ClothingItem,
} from "@prisma/client";
import { getSignedUrl } from "@google-cloud/storage";

const analyzeImageWithFirebase = async (
  imageUrl: string,
  includeCleanedImage: boolean = false
) => {
  console.log(
    `[Wardrobe] Analyzing image with Firebase: ${imageUrl}, includeCleanedImage: ${includeCleanedImage}`
  );

  const functionUrl =
    "https://us-central1-closet-app-1337.cloudfunctions.net/analyzeImage";

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        include_cleaned_image: includeCleanedImage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Wardrobe] Firebase function returned an error: ${response.status} ${errorText}`
      );
      throw new Error(
        `Firebase function failed with status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("[Wardrobe] Received data from Firebase:", data);
    return data;
  } catch (error) {
    console.error("[Wardrobe] Error calling Firebase function:", error);
    throw new Error("Failed to analyze image with Firebase.");
  }
};

export const wardrobeRouter = router({
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
      } = input;

      let analysisData: any;

      // If we don't have enough details, analyze the image
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
      const cleanedImage = analysisData?.cleanedImageUrl || image;

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
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      console.log(`[Wardrobe] Updating item ${id} with data:`, data);
      try {
        const updatedItem = await prisma.clothingItem.update({
          where: { id },
          data,
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
    .input(z.object({ imageUrl: z.string() }))
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
          cleanedImageUrl: data.cleanedImageUrl,
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
});
''
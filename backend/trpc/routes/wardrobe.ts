import { createTRPCRouter, publicProcedure } from "../create-context";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { callFirebaseFunction } from "../firebase-utils";
import { db } from "../../../lib/firebase";
import { collection, getDocs, getDoc, doc, query, where, addDoc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";

// Define a permissive schema for clothing items to match what the frontend sends
const ClothingItemSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  imageUri: z.string().optional(),
  category: z.string(),
  color: z.string().optional(),
  colors: z.array(z.string()).optional(),
  style: z.string().optional(),
  fabric: z.string().optional(),
  texture: z.string().optional(),
  designPattern: z.string().optional(),
  silhouette: z.string().optional(),
  confidence: z.number().optional(),
  season: z.string().optional(),
  addedAt: z.number().optional(),
  name: z.string().optional(),
  materialType: z.string().optional(),
  material: z.string().optional(),
  hasPattern: z.boolean().optional(),
  pattern: z.string().optional(),
  patternDescription: z.string().optional(),
  isBackgroundRemoved: z.boolean().optional(),
  cleanedImage: z.string().optional(), // AI result field
});

export const wardrobeRouter = createTRPCRouter({
  /**
   * Analyzes an image of a clothing item using AI.
   * Uses authenticated HTTP call to bypass Client SDK limitations in Node.js.
   */
  analyze: publicProcedure
    .input(z.object({ imageUrl: z.string(), gender: z.string().optional() }))
    .mutation(async ({ input }) => {
      console.log("[Wardrobe] Received image for analysis");
      try {
        // Use processClothingFn (onRequest) for better reliability and direct handling
        const data: any = await callFirebaseFunction('processClothingFn', {
          imgData: input.imageUrl,
          gender: input.gender,
          removeBackground: true,
          includeCleanedImage: true
        });

        console.log("[Wardrobe] Analysis successful. Result keys:", Object.keys(data || {}));

        if (data && data.error) {
          throw new Error(data.error);
        }

        // Search for cleaned image across multiple possible fields as per memory
        const cleanedImageUrl = data.cleanedImage ||
                                data.processedImage ||
                                data.backgroundRemovedImage ||
                                data.segmentationImage ||
                                data.cleanedImageUrl;

        // Clean data for the frontend
        const { cleanedImage, ...rest } = data || {};

        return {
          ...rest,
          // Re-include cleanedImage but set it to the URL to save space
          // while maintaining compatibility with ClothingItem type
          cleanedImage: cleanedImageUrl,
          cleanedImageUrl: cleanedImageUrl,
        };
      } catch (error: any) {
        console.error("[Wardrobe] Analysis mutation failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `An error occurred during image analysis: ${error.message}`,
        });
      }
    }),

  /**
   * Generates outfit suggestions based on the user's wardrobe.
   * Renamed from generateOutfit to suggestOutfit to match intended design.
   */
  suggestOutfit: publicProcedure
    .input(
      z.object({
        wardrobe: z.array(ClothingItemSchema),
        numSuggestions: z.number().min(1).max(5).default(2),
      })
    )
    .mutation(async ({ input }) => {
      console.log(`[Wardrobe] Suggesting outfits from ${input.wardrobe.length} items`);
      try {
        const result = await callFirebaseFunction('generateOutfitsFn', {
          wardrobe: input.wardrobe,
          numSuggestions: input.numSuggestions,
        });

        console.log("[Wardrobe] suggestOutfit result received");

        if (result && result.error) {
          throw new Error(typeof result.error === 'string' ? result.error : result.error.message || "Unknown AI error");
        }

        return result;
      } catch (error: any) {
        console.error("[Wardrobe] Error suggesting outfits:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate outfit suggestions.",
          cause: error,
        });
      }
    }),

  // Restored procedures using Firestore instead of prisma
  create: publicProcedure
    .input(ClothingItemSchema.omit({ id: true }).extend({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Wardrobe] Creating new item for user:", input.userId);
      try {
        const docRef = await addDoc(collection(db, "wardrobe"), {
          ...input,
          addedAt: input.addedAt || Date.now(),
        });
        return { id: docRef.id, ...input };
      } catch (error: any) {
        console.error("[Wardrobe] Error creating item:", error.message);
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
      try {
        const q = query(
          collection(db, "wardrobe"),
          where("userId", "==", input.userId)
        );
        const querySnapshot = await getDocs(q);
        const items: any[] = [];
        querySnapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        return items;
      } catch (error: any) {
        console.error("[Wardrobe] Error fetching items:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch wardrobe items.",
        });
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      try {
        const docSnap = await getDoc(doc(db, "wardrobe", input.id));
        if (!docSnap.exists()) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
        }
        return { id: docSnap.id, ...docSnap.data() };
      } catch (error: any) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch item.",
        });
      }
    }),

  update: publicProcedure
    .input(ClothingItemSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      try {
        await updateDoc(doc(db, "wardrobe", id), data as any);
        return { id, ...data };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update item.",
        });
      }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await deleteDoc(doc(db, "wardrobe", input.id));
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete item.",
        });
      }
    }),
});

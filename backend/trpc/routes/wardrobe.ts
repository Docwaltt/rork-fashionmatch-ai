import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getFirebaseApp, callFirebaseFunction } from "../firebase-utils";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { authedProcedure, publicProcedure, router } from "../trpc";

const db = getFirestore(getFirebaseApp());
const wardrobeCollection = db.collection("wardrobe");

export const wardrobeRouter = router({
  getWardrobe: authedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.uid;
    const wardrobeSnapshot = await wardrobeCollection.doc(userId).get();
    const wardrobeData = wardrobeSnapshot.data();
    if (!wardrobeData || !wardrobeData.items) {
      return [];
    }
    return wardrobeData.items;
  }),

  processClothing: authedProcedure
    .input(z.object({ imageUrl: z.string(), gender: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        console.log("[Wardrobe] Calling processClothingFn via FirebaseUtils");
        // Use callFirebaseFunction to call the specialized processClothingFn
        const analysisResult = await callFirebaseFunction('processClothingFn', {
          imgData: input.imageUrl,
          gender: input.gender,
        });

        if (!analysisResult || analysisResult.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: analysisResult?.error || "Image analysis failed to return a result.",
          });
        }

        const result = { ...analysisResult };
        
        // Ensure we have a valid image URI for the frontend
        if (!result.cleanedImageUrl && result.cleanedImage && String(result.cleanedImage).startsWith('http')) {
            result.cleanedImageUrl = result.cleanedImage;
        }

        return result;
      } catch (error: any) {
        console.error("[Wardrobe] processClothing mutation failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `An error occurred during image processing: ${error.message}`,
        });
      }
    }),

  addItem: authedProcedure
    .input(z.any()) 
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.uid;

      try {
        let finalImageUri = input.imageUri;

        if (finalImageUri && !finalImageUri.startsWith('http') && !finalImageUri.startsWith('data:')) {
            finalImageUri = `data:image/png;base64,${finalImageUri}`;
        }

        const itemWithUser = {
          ...input,
          imageUri: finalImageUri,
          userId,
          addedAt: input.addedAt || Date.now(),
        };

        const wardrobeDocRef = wardrobeCollection.doc(userId);
        await wardrobeDocRef.set(
          {
            items: FieldValue.arrayUnion(itemWithUser),
          },
          { merge: true }
        );

        return itemWithUser;
      } catch (error: any) {
        console.error("[Wardrobe] AddItem mutation failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save item: ${error.message}`,
        });
      }
    }),

  generateOutfits: authedProcedure
    .input(
      z.object({
        prompt: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user.uid;
        const wardrobeSnapshot = await wardrobeCollection.doc(userId).get();
        const wardrobeData = wardrobeSnapshot.data();

        if (!wardrobeData || !wardrobeData.items) {
          return {
            title: "Your closet is empty",
            description: "Add some clothes to your wardrobe to get started.",
            items: [],
          };
        }

        const cleanItems = (wardrobeData.items || []).map((item: any) => {
            const { imageUri, cleanedImage, cleanedImageUrl, ...rest } = item;
            return rest;
        });

        const result = await callFirebaseFunction('generateOutfitsFn', {
          wardrobe: cleanItems,
          event: input.prompt
        });

        return result;
      } catch (error: any) {
        console.error("[Wardrobe] Outfit generation failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `An error occurred during outfit generation: ${error.message}`,
        });
      }
    }),

  suggestOutfit: authedProcedure
    .input(z.object({
        wardrobe: z.array(z.any()),
        event: z.string(),
        numSuggestions: z.number().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const cleanWardrobe = (input.wardrobe || []).map((item: any) => {
          const { imageUri, cleanedImage, cleanedImageUrl, ...rest } = item;
          return rest;
        });

        const result = await callFirebaseFunction('generateOutfitsFn', {
          ...input,
          wardrobe: cleanWardrobe
        });
        return result;
      } catch (error: any) {
        console.error("[Wardrobe] Suggest outfit failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }
    }),
});

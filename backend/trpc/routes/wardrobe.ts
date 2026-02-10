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

  analyze: authedProcedure
    .input(z.object({ imageUrl: z.string(), gender: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        console.log("[Wardrobe] Calling analyzeImage function via FirebaseUtils");
        // Use callFirebaseFunction which handles auth and connects to the correct Cloud Run instance
        const analysisResult = await callFirebaseFunction('analyzeImage', {
          image: input.imageUrl,
          gender: input.gender,
          background: 'remove'
        });

        if (!analysisResult || analysisResult.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: analysisResult?.error || "Image analysis failed to return a result.",
          });
        }

        // To prevent truncated responses in the mobile frontend, ensure we don't return massive base64 strings
        // The Cloud Function already returns a permanent Download URL in 'cleanedImageUrl'
        const result = { ...analysisResult };
        delete result.imageUri;
        
        // If cleanedImageUrl is missing but cleanedImage exists and is a URL, use it
        if (!result.cleanedImageUrl && result.cleanedImage && String(result.cleanedImage).startsWith('http')) {
            result.cleanedImageUrl = result.cleanedImage;
        }

        // If cleanedImage is a base64 string without a prefix, add it for safety
        if (result.cleanedImage && !String(result.cleanedImage).startsWith('http') && !String(result.cleanedImage).startsWith('data:')) {
            result.cleanedImage = `data:image/png;base64,${result.cleanedImage}`;
        }

        // Now safe to remove the potentially large base64 'cleanedImage' field if it's redundant
        if (result.cleanedImageUrl && result.cleanedImage && String(result.cleanedImage).length > 1000) {
            delete result.cleanedImage;
        }

        return result;
      } catch (error: any) {
        console.error("[Wardrobe] Analyze mutation failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `An error occurred during image analysis: ${error.message}`,
        });
      }
    }),

  addItem: authedProcedure
    .input(z.any()) // Using any to be flexible with the ClothingItem structure from the UI
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.uid;

      try {
        let finalImageUri = input.imageUri;

        // Fix corruption bug: Only prepend data URI prefix if it's base64 and missing it.
        // If it's already a URL (starts with http), do NOT prepend anything.
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

        // Strip images from wardrobe before sending to AI to keep prompt size manageable
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
        // Strip images from input wardrobe to keep request size manageable
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

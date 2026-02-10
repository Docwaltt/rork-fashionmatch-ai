import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { run } from "@genkit-ai/core";
import {
  ClothingSchema,
  OutfitSuggestionSchema,
  processImage,
  generateOutfits,
} from "../../../functions/src/genkit";
import { getFirebaseApp } from "../firebase-utils";
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

  addItem: authedProcedure
    .input(z.object({ imageUri: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.uid;

      try {
        const analysisResult = await run("processImage", () =>
          processImage(input.imageUri)
        );

        if (!analysisResult) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Image analysis failed to return a result.",
          });
        }

        const data = ClothingSchema.parse(analysisResult);

        const cleanedImageBase64 =
          data.cleanedImage ||
          (analysisResult as any).processedImage ||
          (analysisResult as any).backgroundRemovedImage ||
          (analysisResult as any).segmentationImage ||
          (analysisResult as any).cleanedImageUrl;
        
        // Create a new object for Firestore, excluding the 'cleanedImage' property
        const { cleanedImage, ...firestoreData } = data;

        if (cleanedImageBase64) {
            // Overwrite the imageUri with the cleaned base64 data URI
            firestoreData.imageUri = cleanedImageBase64.startsWith("data:")
            ? cleanedImageBase64
            : `data:image/png;base64,${cleanedImageBase64}`;
        }

        const wardrobeDocRef = wardrobeCollection.doc(userId);
        await wardrobeDocRef.set(
          {
            items: FieldValue.arrayUnion(firestoreData),
          },
          { merge: true }
        );

        return firestoreData;
      } catch (error: any) {
        console.error("[Wardrobe] Analysis mutation failed:", error.message);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `An error occurred during image analysis: ${error.message}`,
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

        const result = await run("generateOutfits", () =>
          generateOutfits(wardrobeData.items, input.prompt)
        );

        return result;
      } catch (error: any) {
        console.error(
          "[Wardrobe] Outfit generation failed:",
          error.message,
          error.stack
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `An error occurred during outfit generation: ${error.message}`,
        });
      }
    }),
});

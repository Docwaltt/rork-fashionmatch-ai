/**
 * Callable Function for direct, authenticated use from the Mobile App.
 */
export declare const processClothingCallable: import("firebase-functions/v2/https").CallableFunction<any, Promise<import("@genkit-ai/core/lib/action-Dt9i8CGd.js").p<any>>>;
export declare const generateOutfitsCallable: import("firebase-functions/v2/https").CallableFunction<any, Promise<import("@genkit-ai/core/lib/action-Dt9i8CGd.js").p<{
    title: string;
    description: string;
    reason: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}[]>>>;
/**
 * Specialized function to merge images into a single outfit.
 * Decoupled to prevent timeout in the main suggestions flow.
 */
export declare const mergeOutfitImagesCallable: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    imageUrl: import("@genkit-ai/core/lib/action-Dt9i8CGd.js").p<string>;
}>>;

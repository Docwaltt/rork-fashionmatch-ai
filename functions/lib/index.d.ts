export declare const analyzeImage: import("firebase-functions/v2/https").CallableFunction<any, Promise<import("@genkit-ai/core").ActionResult<any>>, unknown>;
export declare const generateOutfitsFn: import("firebase-functions/v2/https").CallableFunction<any, Promise<import("@genkit-ai/core").ActionResult<{
    title: string;
    description: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}[]>>, unknown>;
export declare const processClothingFn: import("firebase-functions/v2/https").HttpsFunction;

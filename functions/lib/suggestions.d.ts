import { z } from 'genkit';
export declare const OutfitSuggestionSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    reason: z.ZodString;
    items: z.ZodArray<z.ZodString, "many">;
    generatedImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    reason: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}, {
    title: string;
    description: string;
    reason: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}>;
export declare const generateOutfitImage: import("@genkit-ai/core/lib/action-Dt9i8CGd.js").u<z.ZodArray<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    imageUri: z.ZodOptional<z.ZodString>;
    category: z.ZodString;
    color: z.ZodString;
    style: z.ZodString;
    confidence: z.ZodNumber;
    cleanedImage: z.ZodOptional<z.ZodString>;
    isBackgroundRemoved: z.ZodBoolean;
    fabric: z.ZodOptional<z.ZodString>;
    texture: z.ZodOptional<z.ZodString>;
    silhouette: z.ZodOptional<z.ZodString>;
    materialType: z.ZodOptional<z.ZodString>;
    hasPattern: z.ZodOptional<z.ZodBoolean>;
    patternDescription: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    category: string;
    color: string;
    style: string;
    confidence: number;
    isBackgroundRemoved: boolean;
    id?: string | undefined;
    imageUri?: string | undefined;
    cleanedImage?: string | undefined;
    fabric?: string | undefined;
    texture?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}, {
    category: string;
    color: string;
    style: string;
    confidence: number;
    isBackgroundRemoved: boolean;
    id?: string | undefined;
    imageUri?: string | undefined;
    cleanedImage?: string | undefined;
    fabric?: string | undefined;
    texture?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}>, "many">, z.ZodString, z.ZodTypeAny, import("@genkit-ai/core/lib/action-Dt9i8CGd.js").q<z.ZodTypeAny>>;
export declare const generateOutfits: import("@genkit-ai/core/lib/action-Dt9i8CGd.js").u<z.ZodObject<{
    wardrobe: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        imageUri: z.ZodOptional<z.ZodString>;
        category: z.ZodString;
        color: z.ZodString;
        style: z.ZodString;
        confidence: z.ZodNumber;
        cleanedImage: z.ZodOptional<z.ZodString>;
        isBackgroundRemoved: z.ZodBoolean;
        fabric: z.ZodOptional<z.ZodString>;
        texture: z.ZodOptional<z.ZodString>;
        silhouette: z.ZodOptional<z.ZodString>;
        materialType: z.ZodOptional<z.ZodString>;
        hasPattern: z.ZodOptional<z.ZodBoolean>;
        patternDescription: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        category: string;
        color: string;
        style: string;
        confidence: number;
        isBackgroundRemoved: boolean;
        id?: string | undefined;
        imageUri?: string | undefined;
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }, {
        category: string;
        color: string;
        style: string;
        confidence: number;
        isBackgroundRemoved: boolean;
        id?: string | undefined;
        imageUri?: string | undefined;
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }>, "many">;
    numSuggestions: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    event: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    wardrobe: {
        category: string;
        color: string;
        style: string;
        confidence: number;
        isBackgroundRemoved: boolean;
        id?: string | undefined;
        imageUri?: string | undefined;
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }[];
    numSuggestions: number;
    event?: string | undefined;
}, {
    wardrobe: {
        category: string;
        color: string;
        style: string;
        confidence: number;
        isBackgroundRemoved: boolean;
        id?: string | undefined;
        imageUri?: string | undefined;
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }[];
    numSuggestions?: number | undefined;
    event?: string | undefined;
}>, z.ZodArray<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    reason: z.ZodString;
    items: z.ZodArray<z.ZodString, "many">;
    generatedImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    reason: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}, {
    title: string;
    description: string;
    reason: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}>, "many">, z.ZodTypeAny, import("@genkit-ai/core/lib/action-Dt9i8CGd.js").q<z.ZodTypeAny>>;

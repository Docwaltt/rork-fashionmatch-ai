import { z } from 'genkit';
export declare const ClothingSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
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
    cleanedImage?: string | undefined;
    fabric?: string | undefined;
    texture?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}>;
export declare const processClothing: import("genkit").Action<z.ZodAny, z.ZodAny, z.ZodTypeAny>;
export declare const OutfitSuggestionSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    items: z.ZodArray<z.ZodString, "many">;
    generatedImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}, {
    title: string;
    description: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}>;
export declare const generateOutfitImage: import("genkit").Action<z.ZodArray<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
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
    cleanedImage?: string | undefined;
    fabric?: string | undefined;
    texture?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}>, "many">, z.ZodString, z.ZodTypeAny>;
export declare const generateOutfits: import("genkit").Action<z.ZodObject<{
    wardrobe: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
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
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }>, "many">;
    numSuggestions: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    wardrobe: {
        category: string;
        color: string;
        style: string;
        confidence: number;
        isBackgroundRemoved: boolean;
        id?: string | undefined;
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }[];
    numSuggestions: number;
}, {
    wardrobe: {
        category: string;
        color: string;
        style: string;
        confidence: number;
        isBackgroundRemoved: boolean;
        id?: string | undefined;
        cleanedImage?: string | undefined;
        fabric?: string | undefined;
        texture?: string | undefined;
        silhouette?: string | undefined;
        materialType?: string | undefined;
        hasPattern?: boolean | undefined;
        patternDescription?: string | undefined;
    }[];
    numSuggestions?: number | undefined;
}>, z.ZodArray<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    items: z.ZodArray<z.ZodString, "many">;
    generatedImageUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}, {
    title: string;
    description: string;
    items: string[];
    generatedImageUrl?: string | undefined;
}>, "many">, z.ZodTypeAny>;

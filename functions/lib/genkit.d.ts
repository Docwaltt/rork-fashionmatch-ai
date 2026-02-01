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
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    items: string[];
}, {
    title: string;
    description: string;
    items: string[];
}>;
export declare const generateOutfits: import("genkit").Action<z.ZodArray<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    category: z.ZodString;
    color: z.ZodString;
    style: z.ZodString;
    confidence: z.ZodNumber;
    cleanedImage: z.ZodOptional<z.ZodString>;
    isBackgroundRemoved: z.ZodBoolean;
    fabric: z.ZodOptional<z.ZodString>;
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
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}>, "many">, z.ZodArray<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    items: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    items: string[];
}, {
    title: string;
    description: string;
    items: string[];
}>, "many">, z.ZodTypeAny>;

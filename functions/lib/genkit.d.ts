import { z } from 'genkit';
/**
 * Lenient schema for clothing items.
 * Fields are made optional to support legacy items in the wardrobe
 * that might not have all the AI-extracted metadata.
 */
export declare const ClothingSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    imageUri: z.ZodOptional<z.ZodString>;
    category: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    color: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    style: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    confidence: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cleanedImage: z.ZodOptional<z.ZodString>;
    isBackgroundRemoved: z.ZodOptional<z.ZodBoolean>;
    material: z.ZodOptional<z.ZodString>;
    fabric: z.ZodOptional<z.ZodString>;
    pattern: z.ZodOptional<z.ZodString>;
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
    id?: string | undefined;
    imageUri?: string | undefined;
    cleanedImage?: string | undefined;
    isBackgroundRemoved?: boolean | undefined;
    material?: string | undefined;
    fabric?: string | undefined;
    pattern?: string | undefined;
    texture?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}, {
    id?: string | undefined;
    imageUri?: string | undefined;
    category?: string | undefined;
    color?: string | undefined;
    style?: string | undefined;
    confidence?: number | undefined;
    cleanedImage?: string | undefined;
    isBackgroundRemoved?: boolean | undefined;
    material?: string | undefined;
    fabric?: string | undefined;
    pattern?: string | undefined;
    texture?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}>;
export declare const ai: import("genkit/lib/index-5yfMIzsW").G;

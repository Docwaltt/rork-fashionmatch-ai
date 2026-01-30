import { z } from 'genkit';
export declare const ClothingSchema: z.ZodObject<{
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
    cleanedImage?: string | undefined;
    fabric?: string | undefined;
    silhouette?: string | undefined;
    materialType?: string | undefined;
    hasPattern?: boolean | undefined;
    patternDescription?: string | undefined;
}>;
export declare const processClothing: import("genkit").Action<z.ZodAny, z.ZodAny, z.ZodTypeAny>;

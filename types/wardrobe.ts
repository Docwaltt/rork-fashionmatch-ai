import { MaleClothingCategory, FemaleClothingCategory } from "./user";

export type ClothingCategory = MaleClothingCategory | FemaleClothingCategory | "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessories";

export type ClothingItem = {
  id: string;
  userId: string;
  imageUri: string;
  category: ClothingCategory;
  colors: string[];
  color: string;
  style: string;
  fabric?: string;
  silhouette?: string;
  confidence: number;
  season?: string;
  addedAt: number;
  name?: string;
  materialType?: string;
  hasPattern?: boolean;
  patternDescription?: string;
  // Legacy fields for compatibility
  texture?: string;
  designPattern?: string;
};

export type OutfitSuggestion = {
  id: string;
  event: string;
  items: ClothingItem[];
  confidence: number;
};

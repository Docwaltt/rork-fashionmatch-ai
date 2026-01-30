import { MaleClothingCategory, FemaleClothingCategory } from "./user";

export type ClothingCategory = MaleClothingCategory | FemaleClothingCategory | "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessories";

export type ClothingItem = {
  id: string;
  userId: string;
  imageUri: string;
  category: ClothingCategory;
  color: string;
  style: string;
  fabric?: string;
  texture?: string; 
  designPattern?: string;
  silhouette?: string;
  confidence: number;
  season?: string;
  addedAt: number;
  name?: string;
  materialType?: string;
  hasPattern?: boolean;
  patternDescription?: string;
  thumbnailUri?: string; // New field for thumbnails
};

export type OutfitSuggestion = {
  id: string;
  event: string;
  items: ClothingItem[];
  confidence: number;
  reasoning?: string; // New field for suggestion reasoning
  pairingDescription?: string; // New field for how to wear it
};

import { MaleClothingCategory, FemaleClothingCategory } from "./user";

export type ClothingCategory = MaleClothingCategory | FemaleClothingCategory | "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessories";

export type ClothingItem = {
  id: string;
  userId: string;
  imageUri: string;
  category: ClothingCategory;
  colors: string[];
  texture?: string;
  designPattern?: string;
  season?: string;
  addedAt: number;
  name?: string;
};

export type OutfitSuggestion = {
  id: string;
  event: string;
  items: ClothingItem[];
  confidence: number;
};

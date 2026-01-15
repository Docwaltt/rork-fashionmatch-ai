export type ClothingCategory = "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessories";

export type ClothingItem = {
  id: string;
  imageUri: string;
  category: ClothingCategory;
  colors: string[];
  season?: string;
  addedAt: number;
};

export type OutfitSuggestion = {
  id: string;
  event: string;
  items: ClothingItem[];
  confidence: number;
};

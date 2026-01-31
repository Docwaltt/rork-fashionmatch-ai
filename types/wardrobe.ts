export interface WardrobeItem {
  id: string;
  userId: string;
  imageUrl: string;
  category: string;
  subCategory?: string;
  colors: string[];
  season?: 'Spring' | 'Summer' | 'Autumn' | 'Winter';
  occasion?: 'Casual' | 'Formal' | 'Work' | 'Party' | 'Sport';
  fabric?: string;
  material?: string;
  pattern?: string;
  addedAt: string;
}
import { MaleClothingCategory, FemaleClothingCategory } from "./user";

export type ClothingCategory = MaleClothingCategory | FemaleClothingCategory | "top" | "bottom" | "dress" | "outerwear" | "shoes" | "accessories";

export type ClothingItem = {
  id: string;
  userId: string;
  imageUri: string;
  category: ClothingCategory;
  color: string;
  colors?: string[];
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
  material?: string; // Added to match user request
  pattern?: string; // Added to match user request
};

export type OutfitSuggestion = {
  id: string;
  event: string;
  items: ClothingItem[];
  confidence: number;
  reasoning?: string; // New field for suggestion reasoning
  pairingDescription?: string; // New field for how to wear it
};

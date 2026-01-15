export type Gender = 'male' | 'female';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  gender: Gender;
  profilePhotoUri?: string;
  location?: {
    city: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: number;
  updatedAt: number;
};

export type MaleClothingCategory = 
  | 'shirt'
  | 't-shirt'
  | 'polo'
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'suit'
  | 'blazer'
  | 'jacket'
  | 'sweater'
  | 'hoodie'
  | 'shoes'
  | 'sneakers'
  | 'boots'
  | 'accessories'
  | 'watch'
  | 'belt'
  | 'tie';

export type FemaleClothingCategory = 
  | 'blouse'
  | 'top'
  | 't-shirt'
  | 'dress'
  | 'gown'
  | 'skirt'
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'jumpsuit'
  | 'jacket'
  | 'cardigan'
  | 'sweater'
  | 'coat'
  | 'heels'
  | 'flats'
  | 'sneakers'
  | 'boots'
  | 'sandals'
  | 'bag'
  | 'jewelry'
  | 'accessories';

export const MALE_CATEGORIES: { id: MaleClothingCategory; label: string; icon: string }[] = [
  { id: 'shirt', label: 'Shirt', icon: '👔' },
  { id: 't-shirt', label: 'T-Shirt', icon: '👕' },
  { id: 'polo', label: 'Polo', icon: '🎽' },
  { id: 'trousers', label: 'Trousers', icon: '👖' },
  { id: 'jeans', label: 'Jeans', icon: '👖' },
  { id: 'shorts', label: 'Shorts', icon: '🩳' },
  { id: 'suit', label: 'Suit', icon: '🤵' },
  { id: 'blazer', label: 'Blazer', icon: '🧥' },
  { id: 'jacket', label: 'Jacket', icon: '🧥' },
  { id: 'sweater', label: 'Sweater', icon: '🧶' },
  { id: 'hoodie', label: 'Hoodie', icon: '🧥' },
  { id: 'shoes', label: 'Formal Shoes', icon: '👞' },
  { id: 'sneakers', label: 'Sneakers', icon: '👟' },
  { id: 'boots', label: 'Boots', icon: '🥾' },
  { id: 'accessories', label: 'Accessories', icon: '🎩' },
  { id: 'watch', label: 'Watch', icon: '⌚' },
  { id: 'belt', label: 'Belt', icon: '🪢' },
  { id: 'tie', label: 'Tie', icon: '👔' },
];

export const FEMALE_CATEGORIES: { id: FemaleClothingCategory; label: string; icon: string }[] = [
  { id: 'blouse', label: 'Blouse', icon: '👚' },
  { id: 'top', label: 'Top', icon: '👚' },
  { id: 't-shirt', label: 'T-Shirt', icon: '👕' },
  { id: 'dress', label: 'Dress', icon: '👗' },
  { id: 'gown', label: 'Gown', icon: '👗' },
  { id: 'skirt', label: 'Skirt', icon: '🩱' },
  { id: 'trousers', label: 'Trousers', icon: '👖' },
  { id: 'jeans', label: 'Jeans', icon: '👖' },
  { id: 'shorts', label: 'Shorts', icon: '🩳' },
  { id: 'jumpsuit', label: 'Jumpsuit', icon: '🩱' },
  { id: 'jacket', label: 'Jacket', icon: '🧥' },
  { id: 'cardigan', label: 'Cardigan', icon: '🧥' },
  { id: 'sweater', label: 'Sweater', icon: '🧶' },
  { id: 'coat', label: 'Coat', icon: '🧥' },
  { id: 'heels', label: 'Heels', icon: '👠' },
  { id: 'flats', label: 'Flats', icon: '🥿' },
  { id: 'sneakers', label: 'Sneakers', icon: '👟' },
  { id: 'boots', label: 'Boots', icon: '👢' },
  { id: 'sandals', label: 'Sandals', icon: '👡' },
  { id: 'bag', label: 'Bag', icon: '👜' },
  { id: 'jewelry', label: 'Jewelry', icon: '💍' },
  { id: 'accessories', label: 'Accessories', icon: '🎀' },
];

export const getCategoriesForGender = (gender: Gender) => {
  return gender === 'male' ? MALE_CATEGORIES : FEMALE_CATEGORIES;
};

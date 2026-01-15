import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ClothingItem } from "@/types/wardrobe";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const [WardrobeProvider, useWardrobe] = createContextHook(() => {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const queryClient = useQueryClient();

  const wardrobeQuery = useQuery({
    queryKey: ["wardrobe"],
    queryFn: async () => {
      console.log('[WardrobeContext] Fetching items from Firestore');
      const querySnapshot = await getDocs(collection(db, "wardrobe"));
      const items: ClothingItem[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id } as ClothingItem);
      });
      console.log('[WardrobeContext] Fetched items:', items.length);
      setItems(items);
      return items;
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: ClothingItem) => {
      console.log('[WardrobeContext] Adding item to Firestore:', item.category);
      await addDoc(collection(db, "wardrobe"), item);
      console.log('[WardrobeContext] Item added successfully');
      return item;
    },
    onSuccess: () => {
      console.log('[WardrobeContext] Add mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
    },
    onError: (error) => {
      console.error('[WardrobeContext] Add mutation error:', error);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('[WardrobeContext] Removing item from Firestore:', id);
      await deleteDoc(doc(db, "wardrobe", id));
      console.log('[WardrobeContext] Item removed successfully');
      return id;
    },
    onSuccess: () => {
      console.log('[WardrobeContext] Remove mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
    },
    onError: (error) => {
      console.error('[WardrobeContext] Remove mutation error:', error);
    },
  });

  const uploadImage = async (uri: string, itemId: string): Promise<string> => {
    console.log('[WardrobeContext] Uploading image to Firebase Storage');
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `wardrobe/${itemId}.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('[WardrobeContext] Image uploaded, URL:', downloadUrl);
    return downloadUrl;
  };

  const addItem = (item: ClothingItem) => {
    console.log('[WardrobeContext] Adding item:', item.id, item.category);
    addItemMutation.mutate(item);
  };

  const removeItem = (id: string) => {
    console.log('[WardrobeContext] Removing item:', id);
    removeItemMutation.mutate(id);
  };

  const getItemsByCategory = useCallback(
    (category: ClothingItem["category"]) => {
      return items.filter((item) => item.category === category);
    },
    [items]
  );

  return {
    items,
    addItem,
    removeItem,
    uploadImage,
    getItemsByCategory,
    isLoading: wardrobeQuery.isLoading,
    isSaving: addItemMutation.isPending || removeItemMutation.isPending,
  };
});

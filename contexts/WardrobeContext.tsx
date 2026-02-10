import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useEffect } from "react";
import { ClothingItem, ClothingCategory } from "@/types/wardrobe";
import { db, storage, auth } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, where, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Helper to sanitize data for Firestore (removes undefined values)
const sanitizeForFirestore = (data: any) => {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
};

export const [WardrobeProvider, useWardrobe] = createContextHook(() => {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log('[WardrobeContext] Auth state changed, user:', user?.uid);
      setCurrentUserId(user?.uid || null);
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["wardrobe", user.uid] });
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  const wardrobeQuery = useQuery({
    queryKey: ["wardrobe", currentUserId],
    queryFn: async () => {
      if (!currentUserId) {
        console.log('[WardrobeContext] No user, returning empty array');
        return [];
      }
      
      console.log('[WardrobeContext] Fetching items for user:', currentUserId);
      const q = query(
        collection(db, "wardrobe"),
        where("userId", "==", currentUserId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedItems: ClothingItem[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedItems.push({ ...docSnap.data(), id: docSnap.id } as ClothingItem);
      });
      console.log('[WardrobeContext] Fetched items:', fetchedItems.length);
      setItems(fetchedItems);
      return fetchedItems;
    },
    enabled: !!currentUserId,
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: Omit<ClothingItem, "userId"> & { userId?: string }) => {
      if (!currentUserId) throw new Error("No authenticated user");
      
      let imageUrl = item.imageUri;
      if (!imageUrl) throw new Error("Item image is missing");

      // Upload image if it's not already a remote URL
      // Base64 starts with 'data:', local file starts with 'file:'
      const isRemote = typeof imageUrl === 'string' && imageUrl.startsWith('http');
      
      if (!isRemote) {
          try {
              console.log('[WardrobeContext] Uploading image before saving...');

              // Defensive prefixing for base64 strings if upload fails or is skipped
              let uploadUri = item.imageUri;
              if (typeof uploadUri === 'string' && !uploadUri.startsWith('http') && !uploadUri.startsWith('data:') && !uploadUri.startsWith('file:')) {
                  uploadUri = `data:image/jpeg;base64,${uploadUri}`;
              }

              // Use the item.id for the image path to match the document ID
              imageUrl = await uploadImage(uploadUri, item.id);
          } catch (e) {
              console.error("Failed to upload image, saving with original URI", e);
              // If upload fails, ensure base64 has prefix before saving to Firestore
              if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                  imageUrl = `data:image/jpeg;base64,${imageUrl}`;
              }
          }
      }

      const itemWithUser: ClothingItem = {
        ...item,
        imageUri: imageUrl,
        userId: currentUserId,
      };
      
      console.log('[WardrobeContext] Adding item to Firestore:', itemWithUser.category);
      // Use setDoc with the ID we generated in the UI
      // Sanitize data to remove undefined fields which Firestore rejects
      const cleanItem = sanitizeForFirestore(itemWithUser);
      
      await setDoc(doc(db, "wardrobe", item.id), cleanItem);
      console.log('[WardrobeContext] Item added successfully with ID:', item.id);
      return itemWithUser;
    },
    onSuccess: () => {
      console.log('[WardrobeContext] Add mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["wardrobe", currentUserId] });
    },
    onError: (error) => {
      console.error('[WardrobeContext] Add mutation error:', error);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!currentUserId) throw new Error("No authenticated user");
      
      console.log('[WardrobeContext] Removing item from Firestore:', id);
      
      try {
        const storageRef = ref(storage, `wardrobe/${currentUserId}/${id}.jpg`);
        await deleteObject(storageRef);
        console.log('[WardrobeContext] Image deleted from storage');
      } catch (e) {
        console.log('[WardrobeContext] No image to delete or error:', e);
      }
      
      await deleteDoc(doc(db, "wardrobe", id));
      console.log('[WardrobeContext] Item removed successfully');
      return id;
    },
    onSuccess: () => {
      console.log('[WardrobeContext] Remove mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["wardrobe", currentUserId] });
    },
    onError: (error) => {
      console.error('[WardrobeContext] Remove mutation error:', error);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (item: Partial<ClothingItem> & { id: string }) => {
      if (!currentUserId) throw new Error("No authenticated user");
      
      console.log('[WardrobeContext] Updating item in Firestore:', item.id);
      const { id, ...updateData } = item;
      
      // Sanitize update data as well
      const cleanUpdateData = sanitizeForFirestore(updateData);
      
      // Using 'as any' to bypass the strict type checking error for updateDoc
      // because cleanUpdateData has dynamic keys which TS finds incompatible with FieldValue
      await updateDoc(doc(db, "wardrobe", id), cleanUpdateData as any);
      console.log('[WardrobeContext] Item updated successfully');
      return item;
    },
    onSuccess: () => {
      console.log('[WardrobeContext] Update mutation success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ["wardrobe", currentUserId] });
    },
    onError: (error) => {
      console.error('[WardrobeContext] Update mutation error:', error);
    },
  });

  const uploadImage = async (uri: string, itemId: string): Promise<string> => {
    if (!currentUserId) throw new Error("No authenticated user");
    
    console.log('[WardrobeContext] Uploading image to Firebase Storage');
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `wardrobe/${currentUserId}/${itemId}.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    console.log('[WardrobeContext] Image uploaded, URL:', downloadUrl);
    return downloadUrl;
  };

  const addItem = async (item: Omit<ClothingItem, "userId">) => {
    console.log('[WardrobeContext] Adding item:', item.id, item.category);
    return await addItemMutation.mutateAsync(item);
  };

  const removeItem = (id: string) => {
    console.log('[WardrobeContext] Removing item:', id);
    removeItemMutation.mutate(id);
  };

  const updateItem = (item: Partial<ClothingItem> & { id: string }) => {
    console.log('[WardrobeContext] Updating item:', item.id);
    updateItemMutation.mutate(item);
  };

  const getItemsByCategory = useCallback(
    (category: ClothingCategory) => {
      return items.filter((item) => item.category === category);
    },
    [items]
  );

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    uploadImage,
    getItemsByCategory,
    isLoading: wardrobeQuery.isLoading,
    isSaving: addItemMutation.isPending || removeItemMutation.isPending || updateItemMutation.isPending,
    currentUserId,
  };
});

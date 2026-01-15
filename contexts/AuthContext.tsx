import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth, db, storage } from "@/lib/firebase";
import { UserProfile } from "@/types/user";

const USER_PROFILE_KEY = "dressya_user_profile";

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log("[AuthContext] Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("[AuthContext] Auth state changed:", user?.email);
      setFirebaseUser(user);
      
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
        await AsyncStorage.removeItem(USER_PROFILE_KEY);
      }
      
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      console.log("[AuthContext] Fetching user profile for:", uid);
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
        return profile;
      }
      return null;
    } catch (error) {
      console.error("[AuthContext] Error fetching profile:", error);
      return null;
    }
  };

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log("[AuthContext] Signing up user:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    },
    onError: (error) => {
      console.error("[AuthContext] Sign up error:", error);
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log("[AuthContext] Signing in user:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    },
    onError: (error) => {
      console.error("[AuthContext] Sign in error:", error);
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      console.log("[AuthContext] Signing out user");
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wardrobe"] });
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (profileData: Omit<UserProfile, "id" | "createdAt" | "updatedAt">) => {
      if (!firebaseUser) throw new Error("No authenticated user");
      
      console.log("[AuthContext] Creating user profile");
      const now = Date.now();
      const profile: UserProfile = {
        ...profileData,
        id: firebaseUser.uid,
        createdAt: now,
        updatedAt: now,
      };
      
      try {
        await setDoc(doc(db, "users", firebaseUser.uid), profile);
        console.log("[AuthContext] Profile saved to Firestore");
      } catch (firestoreError: any) {
        console.error("[AuthContext] Firestore error:", firestoreError?.code, firestoreError?.message);
        console.log("[AuthContext] Saving profile locally as fallback");
      }
      
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      setUserProfile(profile);
      return profile;
    },
    onError: (error) => {
      console.error("[AuthContext] Create profile error:", error);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!firebaseUser || !userProfile) throw new Error("No authenticated user");
      
      console.log("[AuthContext] Updating user profile");
      const updatedProfile = {
        ...userProfile,
        ...updates,
        updatedAt: Date.now(),
      };
      
      await updateDoc(doc(db, "users", firebaseUser.uid), updatedProfile);
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));
      setUserProfile(updatedProfile);
      return updatedProfile;
    },
  });

  const uploadProfilePhoto = async (uri: string): Promise<string | undefined> => {
    if (!firebaseUser) throw new Error("No authenticated user");
    
    try {
      console.log("[AuthContext] Uploading profile photo");
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profiles/${firebaseUser.uid}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      console.log("[AuthContext] Profile photo uploaded:", downloadUrl);
      return downloadUrl;
    } catch (error: any) {
      console.error("[AuthContext] Photo upload error:", error?.code, error?.message);
      console.log("[AuthContext] Using local URI as fallback");
      return uri;
    }
  };

  const signUp = async (email: string, password: string) => {
    return signUpMutation.mutateAsync({ email, password });
  };

  const signIn = async (email: string, password: string) => {
    return signInMutation.mutateAsync({ email, password });
  };

  const signOut = async () => {
    return signOutMutation.mutateAsync();
  };

  const createProfile = async (profileData: Omit<UserProfile, "id" | "createdAt" | "updatedAt">) => {
    return createProfileMutation.mutateAsync(profileData);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    return updateProfileMutation.mutateAsync(updates);
  };

  const isAuthenticated = !!firebaseUser;
  const hasProfile = !!userProfile;
  const needsOnboarding = isAuthenticated && !hasProfile;

  return {
    user: firebaseUser,
    userProfile,
    isInitialized,
    isAuthenticated,
    hasProfile,
    needsOnboarding,
    signUp,
    signIn,
    signOut,
    createProfile,
    updateProfile,
    uploadProfilePhoto,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isCreatingProfile: createProfileMutation.isPending,
    signUpError: signUpMutation.error,
    signInError: signInMutation.error,
  };
});

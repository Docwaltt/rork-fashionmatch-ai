import { trpcClient } from "@/lib/trpc";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Camera, ImageIcon, X, RefreshCcw } from "lucide-react-native";
import { useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

import Colors from "@/constants/colors";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useAuth } from "@/contexts/AuthContext";
import { ClothingCategory } from "@/types/wardrobe";
import { getCategoriesForGender } from "@/types/user";

export default function AddItemScreen() {
  const cameraRef = useRef<CameraView>(null);
  const { userProfile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [detectedColors, setDetectedColors] = useState<string[]>([]);
  const { addItem } = useWardrobe();

    const categories = useMemo(() => {
    if (userProfile?.gender) {
      return getCategoriesForGender(userProfile.gender);
    }
    // Fallback if profile is missing or loading
    // Return a default list of common categories to ensure the UI is not empty
    const fallbackCategories: { id: ClothingCategory; label: string; icon: string }[] = [
      { id: 'top', label: 'Top', icon: '👕' },
      { id: 'bottom', label: 'Bottom', icon: '👖' },
      { id: 'dress', label: 'Dress', icon: '👗' },
      { id: 'shoes', label: 'Shoes', icon: '👟' },
      { id: 'outerwear', label: 'Outer', icon: '🧥' },
      { id: 'accessories', label: 'Accs', icon: '👜' },
    ];
    return fallbackCategories;
  }, [userProfile?.gender]);

  const processImageMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      console.log("[AddItem] Starting image processing...");
      console.log("[AddItem] Image URI:", imageUri.substring(0, 100) + "...");
      console.log("[AddItem] User gender:", userProfile?.gender);
      
      try {
        console.log("[AddItem] Resizing image...");
        const manipResult = await manipulateAsync(
          imageUri,
          [{ resize: { width: 800 } }],
          { compress: 0.6, format: SaveFormat.JPEG, base64: true }
        );
        console.log("[AddItem] Image resized, base64 length:", manipResult.base64?.length);

        if (!manipResult.base64) {
          throw new Error("Failed to convert image to base64");
        }

        const base64Data = `data:image/jpeg;base64,${manipResult.base64}`;
        
        console.log("[AddItem] Calling backend analyzeImage...");
        // Add timeout to fetch to prevent hanging
        const data = await trpcClient.wardrobe.analyzeImage.mutate({
          image: base64Data,
          gender: userProfile?.gender
        });
        console.log("[AddItem] Backend response:", JSON.stringify(data).substring(0, 200));

        return data;
      } catch (e: any) {
        console.error("[AddItem] Processing failed:", e);
        console.error("[AddItem] Error name:", e?.name);
        console.error("[AddItem] Error message:", e?.message);
        
        // Improve error message for user
        let userMessage = "Could not analyze the image.";
        if (e?.message?.includes("Network request failed")) {
            userMessage = "Network error. Please check your connection.";
        } else if (e?.message?.includes("JSON")) {
            userMessage = "Invalid response from server.";
        } else if (e?.message) {
            userMessage = `Error: ${e.message}`;
        }
        
        throw new Error(userMessage);
      }
    },
    onSuccess: (data) => {
      console.log("Backend analysis response:", data);

      if (data.cleanedImage) {
        // If cleanedImage is a base64 string, ensure it has prefix if missing
        const imageSrc = data.cleanedImage.startsWith('data:') 
          ? data.cleanedImage 
          : `data:image/png;base64,${data.cleanedImage}`;
        setProcessedImage(imageSrc);
      } else {
        // If no cleaned image returned (e.g. background removal failed), use original
        setProcessedImage(capturedImage);
      }
      
      if (data.category) {
        const returnedCategory = data.category.toLowerCase().trim();
        console.log("Backend returned category:", returnedCategory);

        // Try exact match first (ID match)
        let matchedCat = categories.find(c => c.id.toLowerCase() === returnedCategory);

        // If no exact match, try fuzzy match on label or ID
        if (!matchedCat) {
            matchedCat = categories.find(c => 
                returnedCategory.includes(c.id.toLowerCase()) || 
                returnedCategory.includes(c.label.toLowerCase()) ||
                c.label.toLowerCase().includes(returnedCategory)
            );
        }
        
        if (matchedCat) {
          console.log("Matched category:", matchedCat.id);
          setSelectedCategory(matchedCat.id as ClothingCategory);
        } else {
            console.log("No matching category found for:", returnedCategory);
            // If the backend returns a category we don't strictly have, we should probably still accept it 
            // or map it to a default "Other" if possible, but for now showing the alert is okay, 
            // but let's make it clearer that the backend *did* work.
            Alert.alert(
                "Category Mismatch", 
                `We detected "${data.category}" but couldn't match it to a standard category. Please select the closest one.`
            );
        }
      }

      if (data.color) {
        setDetectedColors([data.color]);
      }
    },
    onError: (error) => {
       console.log("Error processing image mutation:", error);
       Alert.alert("Processing Failed", error.message || "Could not analyze the image. Please try again or add manually.");
       // Allow user to proceed manually with the original image
       setProcessedImage(capturedImage);
    }
  });

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true, // Faster capture
      });
      
      if (photo && photo.uri) {
        setCapturedImage(photo.uri);
        setShowCamera(false);
        processImageMutation.mutate(photo.uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Camera Error", "Failed to take photo");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as const,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedImage(asset.uri);
        processImageMutation.mutate(asset.uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Gallery Error", "Failed to pick image");
    }
  };

  const handleSaveItem = () => {
    if (!processedImage || !selectedCategory) return;

    const newItem = {
      id: Date.now().toString(),
      imageUri: processedImage,
      category: selectedCategory,
      colors: detectedColors,
      addedAt: Date.now(),
    };

    addItem(newItem);
    
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedCategory(null);
    setDetectedColors([]);
    processImageMutation.reset();
    
    router.back();
  };

  const handleReset = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedCategory(null);
    setDetectedColors([]);
    processImageMutation.reset();
  };

  if (showCamera) {
    if (!permission) return <View />;
    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera access required.</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Allow Access</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <StatusBar hidden />
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <SafeAreaView style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
              <X size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.cameraControls}>
              <TouchableOpacity 
                style={styles.flipButton} 
                onPress={() => setFacing(current => (current === "back" ? "front" : "back"))}
              >
                <RefreshCcw size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <View style={styles.flipButtonPlaceholder} />
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.richBlack, "#121214"]}
        style={StyleSheet.absoluteFill}
      />
      
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
           <Text style={styles.headerSubtitle}>ADD TO COLLECTION</Text>
           <Text style={styles.headerTitle}>NEW PIECE</Text>
        </View>

        {!capturedImage ? (
          <View style={styles.content}>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => setShowCamera(true)}>
                <View style={styles.actionIcon}>
                  <Camera size={32} color={Colors.gold[400]} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>TAKE PHOTO</Text>
                <Text style={styles.actionDesc}>Capture with camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handlePickImage}>
                <View style={styles.actionIcon}>
                  <ImageIcon size={32} color={Colors.gold[400]} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>UPLOAD</Text>
                <Text style={styles.actionDesc}>From gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView style={styles.formContainer}>
            <View style={styles.imageSection}>
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: processedImage || capturedImage }} 
                  style={styles.mainPreview}
                  contentFit="contain"
                />
                {processImageMutation.isPending && (
                  <View style={styles.processingOverlay}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                    <ActivityIndicator color={Colors.gold[400]} />
                    <Text style={styles.processingText}>REMOVING BACKGROUND...</Text>
                  </View>
                )}
                {processImageMutation.isError && (
                  <View style={styles.errorOverlay}>
                    <Text style={styles.errorIcon}>!</Text>
                    <Text style={styles.errorText}>Unable to process image</Text>
                    <Text style={styles.errorSubtext}>Please try again or use a different photo</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.retakeButton} onPress={handleReset}>
                <X size={16} color={Colors.gray[500]} />
                <Text style={styles.retakeText}>CANCEL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              {detectedColors.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={styles.sectionTitle}>COLOR</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {detectedColors.map((color, index) => (
                      <View key={index} style={{ 
                        paddingHorizontal: 16, 
                        paddingVertical: 8, 
                        backgroundColor: Colors.card,
                        borderWidth: 1,
                        borderColor: Colors.gold[400],
                        borderRadius: 0,
                      }}>
                        <Text style={{ color: Colors.gold[400], fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
                          {color.toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === cat.id && styles.categoryChipSelected
                    ]}
                    onPress={() => setSelectedCategory(cat.id as ClothingCategory)}
                  >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && styles.categoryChipTextSelected
                    ]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.footer}>
              {processImageMutation.isError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>Image processing failed. Please retake or upload a new photo.</Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!processedImage || !selectedCategory || processImageMutation.isPending) && styles.saveButtonDisabled
                ]}
                onPress={handleSaveItem}
                disabled={!processedImage || !selectedCategory || processImageMutation.isPending}
              >
                <LinearGradient
                  colors={(!processedImage || !selectedCategory || processImageMutation.isPending) 
                    ? [Colors.gray[200], Colors.gray[200]] 
                    : [Colors.gold[300], Colors.gold[500]]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>ADD TO WARDROBE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.richBlack,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.gold[400],
    letterSpacing: 2,
    marginBottom: 4,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "300",
    color: Colors.white,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-light',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  actionsGrid: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: Colors.card,
    borderRadius: 0,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  actionIcon: {
    marginBottom: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray[50],
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  formContainer: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  imagePreviewContainer: {
    width: 240,
    height: 240,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainPreview: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  processingText: {
    color: Colors.gold[400],
    fontSize: 10,
    marginTop: 12,
    letterSpacing: 1,
    fontWeight: '600',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 0, 0, 0.85)',
  },
  errorIcon: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  errorText: {
    color: Colors.white,
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 0, 0, 0.5)',
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#ff6b6b',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  retakeText: {
    color: Colors.gray[500],
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 2,
    marginBottom: 16,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  categoryChip: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    width: '30%',
  },
  categoryChipSelected: {
    borderColor: Colors.gold[400],
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  categoryChipText: {
    fontSize: 12,
    color: Colors.gray[500],
    letterSpacing: 1,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: Colors.gold[400],
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  saveButton: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.richBlack,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 24,
  },
  closeButton: {
    padding: 12,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 40,
    width: '100%',
  },
  flipButton: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
  },
  flipButtonPlaceholder: {
    width: 48,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'black',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.richBlack,
  },
  permissionText: {
    color: Colors.white,
    marginBottom: 20,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.white,
  },
  permissionButtonText: {
    fontWeight: '600',
  },
});

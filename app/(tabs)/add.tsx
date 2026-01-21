import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import { router, useRouter } from "expo-router";
import { Camera, ImageIcon, X, RefreshCcw, Loader2 } from "lucide-react-native";
import { useState, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";

import { functions } from "@/lib/firebase";
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
  const [isProcessing, setIsProcessing] = useState(false);
  const { addItem } = useWardrobe();

  const processImageMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      console.log("[AddItem] Starting image processing...");
      
      let base64Image: string;
      
      if (imageUri.startsWith("data:")) {
        base64Image = imageUri.split(",")[1];
      } else {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64Image = base64;
      }
      
      console.log("[AddItem] Calling Firebase analyzeImage function...");
      const analyzeImage = httpsCallable(functions, "analyzeImage");
      const result = await analyzeImage({ imgData: base64Image });
      
      console.log("[AddItem] Firebase response received:", result.data);
      return result.data as {
        processedImage?: string;
        colors?: string[];
        category?: string;
      };
    },
    onSuccess: (data) => {
      console.log("[AddItem] Processing successful:", data);
      if (data.processedImage) {
        setProcessedImage(`data:image/png;base64,${data.processedImage}`);
      }
      if (data.colors && data.colors.length > 0) {
        setDetectedColors(data.colors);
      }
      if (data.category) {
        const validCategories = categories.map(c => c.id);
        if (validCategories.includes(data.category as ClothingCategory)) {
          setSelectedCategory(data.category as ClothingCategory);
        }
      }
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      console.error("[AddItem] Processing error:", error);
      setIsProcessing(false);
      Alert.alert(
        "Processing Failed",
        "Could not analyze the image. You can still select a category manually."
      );
    },
  });

  const handleProcessImage = async (imageUri: string) => {
    setIsProcessing(true);
    setCapturedImage(imageUri);
    setProcessedImage(imageUri);
    processImageMutation.mutate(imageUri);
  };

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

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      
      if (photo && photo.uri) {
        console.log("[AddItem] Photo captured:", photo.uri);
        setShowCamera(false);
        handleProcessImage(photo.uri);
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
        console.log("[AddItem] Image picked:", asset.uri);
        handleProcessImage(asset.uri);
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
    
    Alert.alert(
      "Added!",
      "Item has been added to your wardrobe.",
      [{ text: "OK", onPress: handleReset }]
    );
  };

  const handleStyleMe = () => {
    if (!processedImage || !selectedCategory) return;

    const newItem = {
      id: Date.now().toString(),
      imageUri: processedImage,
      category: selectedCategory,
      colors: detectedColors,
      addedAt: Date.now(),
    };

    addItem(newItem);
    
    // Navigate to styling screen with the new item
    router.push({
      pathname: '/styling',
      params: { 
        itemId: newItem.id,
        fromAdd: 'true'
      }
    });
    
    handleReset();
  };

  const handleReset = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedCategory(null);
    setDetectedColors([]);
    setIsProcessing(false);
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
                {isProcessing && (
                  <View style={styles.processingOverlay}>
                    <ActivityIndicator size="large" color={Colors.gold[400]} />
                    <Text style={styles.processingText}>ANALYZING...</Text>
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
              <TouchableOpacity
                style={[
                  styles.styleButton,
                  (!processedImage || !selectedCategory || isProcessing) && styles.saveButtonDisabled
                ]}
                onPress={handleStyleMe}
                disabled={!processedImage || !selectedCategory || isProcessing}
              >
                <LinearGradient
                  colors={(!processedImage || !selectedCategory || isProcessing) 
                    ? [Colors.gray[200], Colors.gray[200]] 
                    : [Colors.gold[300], Colors.gold[500]]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>✨ STYLE ME</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!processedImage || !selectedCategory || isProcessing) && styles.saveButtonDisabled
                ]}
                onPress={handleSaveItem}
                disabled={!processedImage || !selectedCategory || isProcessing}
              >
                <View style={styles.saveButtonOutline}>
                  <Text style={styles.saveButtonOutlineText}>SAVE TO WARDROBE</Text>
                </View>
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
  styleButton: {
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: 12,
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
  saveButtonOutline: {
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gold[400],
    backgroundColor: 'transparent',
  },
  saveButtonOutlineText: {
    color: Colors.gold[400],
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
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: Colors.gold[400],
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 12,
    fontWeight: '600',
  },
});
